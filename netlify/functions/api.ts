// 双存储：优先 Netlify Blob，失败自动切回文件
import type { Handler, HandlerEvent } from '@netlify/functions';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

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

// ── 文件存储（兜底） ──

function fileRead(id: string): Group | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${id}.json`), 'utf-8'));
  } catch { return null; }
}

function fileWrite(group: Group): void {
  fs.writeFileSync(path.join(DATA_DIR, `${group.id}.json`), JSON.stringify(group));
  let idx: any[] = [];
  try { idx = JSON.parse(fs.readFileSync(path.join(DATA_DIR, '_index.json'), 'utf-8')); } catch {}
  const ei = idx.findIndex((g: any) => g.id === group.id);
  const e = { id: group.id, name: group.name, members: group.members, createdAt: group.createdAt };
  if (ei >= 0) idx[ei] = e; else idx.push(e);
  fs.writeFileSync(path.join(DATA_DIR, '_index.json'), JSON.stringify(idx));
}

// ── Blob 存储 ──

let blobStore: any = null;
let blobTried = false;

async function getBlob() {
  if (blobTried) return blobStore;
  blobTried = true;
  try {
    const mod = await import('@netlify/blobs');
    blobStore = mod.getStore('groups');
  } catch { blobStore = null; }
  return blobStore;
}

async function findGroup(id: string): Promise<Group | null> {
  const bs = await getBlob();
  if (bs) {
    try {
      const data = await bs.get(id, { type: 'json' });
      if (data) return data as Group;
    } catch {}
  }
  return fileRead(id);
}

async function saveGroup(group: Group): Promise<void> {
  const bs = await getBlob();
  if (bs) {
    try {
      await bs.setJSON(group.id, group);
      const idx: any[] = (await bs.get('_index', { type: 'json' })) || [];
      const ei = idx.findIndex((g: any) => g.id === group.id);
      const e = { id: group.id, name: group.name, members: group.members, createdAt: group.createdAt };
      if (ei >= 0) idx[ei] = e; else idx.push(e);
      await bs.setJSON('_index', idx);
      return;
    } catch {}
  }
  fileWrite(group);
}

// ── 路由 ──

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
