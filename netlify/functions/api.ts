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
  await getClient().execute(`CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    date_key TEXT NOT NULL,
    date_label TEXT NOT NULL,
    start_slot TEXT NOT NULL,
    end_slot TEXT NOT NULL,
    activity TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    responses TEXT NOT NULL DEFAULT '{}',
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

    // GET /api/groups/:id/proposals — 获取群组邀约
    const propListMatch = pathname.match(/^\/api\/groups\/([^/]+)\/proposals$/);
    if (method === 'GET' && propListMatch) {
      await ensureTable();
      const rs = await getClient().execute({
        sql: 'SELECT * FROM proposals WHERE group_id = ? ORDER BY created_at DESC',
        args: [propListMatch[1]],
      });
      const proposals = rs.rows.map((r: any) => ({
        id: r.id, groupId: r.group_id, from: r.from,
        to: JSON.parse(r.to), dateKey: r.date_key, dateLabel: r.date_label,
        startSlot: r.start_slot, endSlot: r.end_slot, activity: r.activity,
        note: r.note, responses: JSON.parse(r.responses), createdAt: r.created_at,
      }));
      return { statusCode: 200, body: JSON.stringify(proposals), headers: corsHeaders };
    }

    // POST /api/groups/:id/proposals — 创建邀约
    const propCreateMatch = pathname.match(/^\/api\/groups\/([^/]+)\/proposals$/);
    if (method === 'POST' && propCreateMatch) {
      await ensureTable();
      const { from, to, dateKey, dateLabel, startSlot, endSlot, activity, note } = body;
      const id = nanoid(10);
      const responses: Record<string, string> = {};
      for (const m of to) responses[m] = 'pending';
      await getClient().execute({
        sql: `INSERT INTO proposals (id, group_id, "from", "to", date_key, date_label, start_slot, end_slot, activity, note, responses, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, propCreateMatch[1], from, JSON.stringify(to), dateKey, dateLabel, startSlot, endSlot, activity, note || '', JSON.stringify(responses), new Date().toISOString()],
      });
      return { statusCode: 200, body: JSON.stringify({ id, responses }), headers: corsHeaders };
    }

    // PUT /api/groups/:id/proposals/:pid — 响应邀约
    const propRespMatch = pathname.match(/^\/api\/groups\/([^/]+)\/proposals\/([^/]+)$/);
    if (method === 'PUT' && propRespMatch) {
      await ensureTable();
      const { member, response } = body;
      const rs = await getClient().execute({ sql: 'SELECT * FROM proposals WHERE id = ?', args: [propRespMatch[2]] });
      if (rs.rows.length === 0) return { statusCode: 404, body: JSON.stringify({ error: '邀约不存在' }), headers: corsHeaders };
      const row = rs.rows[0] as any;
      const responses = JSON.parse(row.responses);
      if (responses[member] !== undefined) responses[member] = response;
      await getClient().execute({
        sql: 'UPDATE proposals SET responses = ? WHERE id = ?',
        args: [JSON.stringify(responses), propRespMatch[2]],
      });
      return { statusCode: 200, body: JSON.stringify({ responses }), headers: corsHeaders };
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
