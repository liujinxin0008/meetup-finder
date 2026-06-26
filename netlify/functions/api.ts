// 内联 API — 纯文件存储，无需外部依赖
import type { Handler, HandlerEvent } from '@netlify/functions';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

// ── 数据存储 ──
const DATA_DIR = '/tmp/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

interface Group {
  id: string;
  name: string;
  members: string[];
  schedules: Record<string, Record<string, Record<string, string>>>;
  moods: Record<string, Record<string, string>>;
  createdAt: string;
}

async function findGroup(id: string): Promise<Group | null> {
  const file = path.join(DATA_DIR, `${id}.json`);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch { return null; }
}

async function saveGroup(group: Group): Promise<void> {
  const file = path.join(DATA_DIR, `${group.id}.json`);
  fs.writeFileSync(file, JSON.stringify(group));
  // 更新索引
  const indexFile = path.join(DATA_DIR, '_index.json');
  let index: { id: string; name: string; members: string[]; createdAt: string }[] = [];
  try { index = JSON.parse(fs.readFileSync(indexFile, 'utf-8')); } catch {}
  const existing = index.findIndex(g => g.id === group.id);
  const entry = { id: group.id, name: group.name, members: group.members, createdAt: group.createdAt };
  if (existing >= 0) index[existing] = entry; else index.push(entry);
  fs.writeFileSync(indexFile, JSON.stringify(index));
}

// ── 简单的路由 ──
function parsePath(rawPath: string) {
  // rawPath 如 "/api/groups/xxx/schedule"
  const path = rawPath.replace('/.netlify/functions/api', '');
  return path;
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

    // POST /api/groups — 创建群组
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

    // GET /api/groups/:id — 获取群组
    const getMatch = pathname.match(/^\/api\/groups\/([^/]+)$/);
    if (method === 'GET' && getMatch) {
      const group = await findGroup(getMatch[1]);
      if (!group) return { statusCode: 404, body: JSON.stringify({ error: '群组不存在' }), headers: corsHeaders };
      return { statusCode: 200, body: JSON.stringify(group), headers: corsHeaders };
    }

    // PUT /api/groups/:id/schedule — 更新日程
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

    // PUT /api/groups/:id/mood — 更新心情
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
