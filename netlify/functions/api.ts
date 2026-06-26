// Turso 云数据库——永久存储，数据不丢
import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@libsql/client';
import { nanoid } from 'nanoid';

const DB_URL = 'libsql://meetup-finder-liujinxin0008.aws-us-west-2.turso.io';
const DB_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODI0NzE4NjAsImlkIjoiMDE5ZjAzOTktZmUwMS03M2ZiLTllYWQtYjQzNmUyY2ZmMzA1IiwicmlkIjoiNTMwMjc3NGQtOWVkMy00ODcyLWIxNzAtNjcwYzQ1NDI3MjdhIn0.v8fiIOw-dxErq9HFT9pbZYayThyi92caycDmwHrcXt2ygfSeUHRCZdjuQWpY432DiT4qPwFjCTI6A4rAVHs_DQ';

let _client: ReturnType<typeof createClient> | null = null;
let _ready = false;

function getClient() {
  if (!_client) _client = createClient({ url: DB_URL, authToken: DB_TOKEN });
  return _client;
}

async function ensureTable() {
  if (_ready) return;
  await getClient().execute(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    members TEXT NOT NULL,
    schedules TEXT NOT NULL DEFAULT '{}',
    moods TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`);
  _ready = true;
}

interface Group {
  id: string;
  name: string;
  members: string[];
  schedules: Record<string, Record<string, Record<string, string>>>;
  moods: Record<string, Record<string, string>>;
  createdAt: string;
}

function rowToGroup(row: any): Group {
  return {
    id: row.id,
    name: row.name,
    members: JSON.parse(row.members),
    schedules: JSON.parse(row.schedules),
    moods: JSON.parse(row.moods),
    createdAt: row.created_at,
  };
}

async function findGroup(id: string): Promise<Group | null> {
  await ensureTable();
  const rs = await getClient().execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [id] });
  if (rs.rows.length === 0) return null;
  return rowToGroup(rs.rows[0]);
}

async function saveGroup(group: Group): Promise<void> {
  await ensureTable();
  await getClient().execute({
    sql: `INSERT INTO groups (id, name, members, schedules, moods, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            members = excluded.members,
            schedules = excluded.schedules,
            moods = excluded.moods,
            created_at = excluded.created_at`,
    args: [
      group.id, group.name,
      JSON.stringify(group.members),
      JSON.stringify(group.schedules),
      JSON.stringify(group.moods),
      group.createdAt,
    ],
  });
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
