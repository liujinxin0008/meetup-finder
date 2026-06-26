// Netlify Blob 永久存储
import type { Handler, HandlerEvent } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { nanoid } from 'nanoid';

// 延迟初始化 store，避免冷启动时环境变量不可用
let _store: ReturnType<typeof getStore> | null = null;
function store() {
  if (!_store) _store = getStore('groups');
  return _store;
}

interface Group {
  id: string;
  name: string;
  members: string[];
  schedules: Record<string, Record<string, Record<string, string>>>;
  moods: Record<string, Record<string, string>>;
  createdAt: string;
}

async function findGroup(id: string): Promise<Group | null> {
  try {
    return await store().get(id, { type: 'json' }) as Group | null;
  } catch { return null; }
}

async function saveGroup(group: Group): Promise<void> {
  await store().setJSON(group.id, group);
  const index: { id: string; name: string; members: string[]; createdAt: string }[] =
    (await store().get('_index', { type: 'json' })) || [];
  const existing = index.findIndex(g => g.id === group.id);
  const entry = { id: group.id, name: group.name, members: group.members, createdAt: group.createdAt };
  if (existing >= 0) index[existing] = entry; else index.push(entry);
  await store().setJSON('_index', index);
}

async function handleRequest(event: HandlerEvent): Promise<{ statusCode: number; body: string; headers?: Record<string, string> }> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, body: '', headers: corsHeaders };
  }

  const url = new URL(event.rawUrl);
  const pathname = url.pathname;
  const method = event.httpMethod;

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'POST' && pathname === '/api/groups') {
      const { name, members } = body;
      if (!name || !members || !Array.isArray(members) || members.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: '请提供群名和成员列表' }), headers: corsHeaders };
      }
      const group: Group = {
        id: nanoid(10), name, members,
        schedules: Object.fromEntries(members.map(m => [m, {}])),
        moods: {},
        createdAt: new Date().toISOString(),
      };
      await saveGroup(group);
      return { statusCode: 200, body: JSON.stringify({ id: group.id, ...group }), headers: corsHeaders };
    }

    const getMatch = pathname.match(/^\/api\/groups\/([^/]+)$/);
    if (method === 'GET' && getMatch) {
      const group = await findGroup(getMatch[1]);
      if (!group) return { statusCode: 404, body: JSON.stringify({ error: '群组不存在' }), headers: corsHeaders };
      return { statusCode: 200, body: JSON.stringify(group), headers: corsHeaders };
    }

    const schedMatch = pathname.match(/^\/api\/groups\/([^/]+)\/schedule$/);
    if (method === 'PUT' && schedMatch) {
      const { member, dateKey, busySlots } = body;
      if (!member || !dateKey || typeof busySlots !== 'object') {
        return { statusCode: 400, body: JSON.stringify({ error: '参数不完整' }), headers: corsHeaders };
      }
      const group = await findGroup(schedMatch[1]);
      if (!group) return { statusCode: 404, body: JSON.stringify({ error: '群组不存在' }), headers: corsHeaders };
      if (!group.members.includes(member)) return { statusCode: 400, body: JSON.stringify({ error: '成员不存在' }), headers: corsHeaders };
      if (!group.schedules[member]) group.schedules[member] = {};
      group.schedules[member][dateKey] = busySlots;
      await saveGroup(group);
      return { statusCode: 200, body: JSON.stringify(group), headers: corsHeaders };
    }

    const moodMatch = pathname.match(/^\/api\/groups\/([^/]+)\/mood$/);
    if (method === 'PUT' && moodMatch) {
      const { member, dateKey, mood } = body;
      if (!member || !dateKey || !mood) return { statusCode: 400, body: JSON.stringify({ error: '参数不完整' }), headers: corsHeaders };
      const group = await findGroup(moodMatch[1]);
      if (!group) return { statusCode: 404, body: JSON.stringify({ error: '群组不存在' }), headers: corsHeaders };
      if (!group.members.includes(member)) return { statusCode: 400, body: JSON.stringify({ error: '成员不存在' }), headers: corsHeaders };
      if (!group.moods) group.moods = {};
      if (!group.moods[member]) group.moods[member] = {};
      group.moods[member][dateKey] = mood;
      await saveGroup(group);
      return { statusCode: 200, body: JSON.stringify(group), headers: corsHeaders };
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }), headers: corsHeaders };
  } catch (err: any) {
    console.error('API Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || '服务器错误' }), headers: corsHeaders };
  }
}

export const handler: Handler = async (event, context) => {
  return handleRequest(event);
};
