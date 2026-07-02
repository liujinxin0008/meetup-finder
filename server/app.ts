import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import { findGroup, saveGroup } from './db.js';
import type { Group } from '../src/types.ts';
import { getWeekDates, toDateKey } from '../src/utils/time.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// 确保数据目录存在（本地用 server/data，Netlify 用 /tmp/data）
const DATA_DIR = process.env.NETLIFY
  ? '/tmp/data'
  : path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const app = express();
app.use(express.json());

// ── API 路由 ──

// 创建新群组
app.post('/api/groups', async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: '请提供群名和成员列表' });
    }

    const group: Group = {
      id: nanoid(10),
      name,
      members,
      schedules: {},
      moods: {},
      createdAt: new Date().toISOString(),
    };

    for (const m of members) {
      group.schedules[m] = {};
    }

    await saveGroup(group);
    res.json({ id: group.id, ...group });
  } catch (err) {
    console.error('创建群组失败:', err);
    res.status(500).json({ error: '创建失败' });
  }
});

// 获取群组数据
app.get('/api/groups/:id', async (req, res) => {
  try {
    const group = await findGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }
    res.json(group);
  } catch (err) {
    console.error('获取群组失败:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 更新某人的日程
app.put('/api/groups/:id/schedule', async (req, res) => {
  try {
    const { member, dateKey, busySlots } = req.body;
    if (!member || !dateKey || typeof busySlots !== 'object') {
      return res.status(400).json({ error: '参数不完整' });
    }

    const group = await findGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: '群组不存在' });
    }

    if (!group.members.includes(member)) {
      return res.status(400).json({ error: '成员不存在' });
    }

    if (!group.schedules[member]) {
      group.schedules[member] = {};
    }

    group.schedules[member][dateKey] = busySlots;
    await saveGroup(group);

    res.json(group);
  } catch (err) {
    console.error('更新日程失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// 更新某人的今日心情
app.put('/api/groups/:id/mood', async (req, res) => {
  try {
    const { member, dateKey, mood } = req.body;
    if (!member || !dateKey || !mood) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const group = await findGroup(req.params.id);
    if (!group) return res.status(404).json({ error: '群组不存在' });
    if (!group.members.includes(member)) return res.status(400).json({ error: '成员不存在' });

    if (!group.moods) group.moods = {};
    if (!group.moods[member]) group.moods[member] = {};

    group.moods[member][dateKey] = mood;
    await saveGroup(group);

    res.json(group);
  } catch (err) {
    console.error('更新心情失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// ── 邀约 ──

interface Proposal {
  id: string; groupId: string; from: string; to: string[];
  dateKey: string; dateLabel: string; startSlot: string; endSlot: string;
  activity: string; note: string; responses: Record<string, string>; createdAt: string;
}

// 内存存邀约（本地开发用）
const proposalsStore: Map<string, Proposal[]> = new Map();

app.get('/api/groups/:id/proposals', async (req, res) => {
  res.json(proposalsStore.get(req.params.id) || []);
});

app.post('/api/groups/:id/proposals', async (req, res) => {
  const { from, to, dateKey, dateLabel, startSlot, endSlot, activity, note } = req.body;
  const id = nanoid(10);
  const responses: Record<string, string> = {};
  for (const m of to) responses[m] = 'pending';
  const proposal: Proposal = { id, groupId: req.params.id, from, to, dateKey, dateLabel, startSlot, endSlot, activity, note: note || '', responses, createdAt: new Date().toISOString() };
  const list = proposalsStore.get(req.params.id) || [];
  list.push(proposal);
  proposalsStore.set(req.params.id, list);
  res.json({ id, responses });
});

app.put('/api/groups/:id/proposals/:pid', async (req, res) => {
  const { member, response } = req.body;
  const list = proposalsStore.get(req.params.id) || [];
  const p = list.find(x => x.id === req.params.pid);
  if (!p) return res.status(404).json({ error: '邀约不存在' });
  p.responses[member] = response;
  res.json({ responses: p.responses });
});

// ── AI 助手（DeepSeek） ──

app.post('/api/assistant', async (req, res) => {
  try {
    const { message, groupId } = req.body;
    if (!message || !groupId) {
      return res.status(400).json({ error: '缺少参数' });
    }

    const group = await findGroup(groupId);
    if (!group) return res.status(404).json({ error: '群组不存在' });

    // 构建上下文：本周所有人的日程
    const monday = getMondayForThisWeek();
    const dates = getWeekDates(monday);
    let context = `群组"${group.name}"，成员：${group.members.join('、')}。\n本周日程：\n`;
    for (const m of group.members) {
      context += `\n【${m}】\n`;
      for (const d of dates) {
        const dk = toDateKey(d);
        const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
        const sched = group.schedules[m]?.[dk];
        if (sched && Object.keys(sched).length > 0) {
          const slots = Object.entries(sched).filter(([, v]) => v).sort();
          if (slots.length > 0) {
            context += `  ${dayName} ${d.getMonth() + 1}/${d.getDate()}: ${slots.map(([s, a]) => `${s} ${a}`).join(', ')}\n`;
          }
        }
      }
    }

    const systemPrompt = `你是群组成员的智能日程助手。根据用户的问题类型，你需要判断角色：

如果用户消息以【重要：我是XX的个人助理】开头——这是个人模式，你只处理XX自己的日程，绝对不要提其他人、不要对比、不要说"某人还没签到"。只关注XX自身的工作和任务。

否则——这是全员模式，你需要：
1. 理解并解析用户的日程安排
2. 检查群组其他成员的日程，发现空闲重叠时给出邀约建议
3. 发现有趣的事情时提醒（比如某人全天忙、某人有约会等）

回复格式要求（JSON）：
{
  "reply": "你的自然语言回复，要友好、有温度，像朋友聊天",
  "plans": [
    {"dateKey": "2026-06-29", "dateLabel": "周一 6/29", "slots": {"09:00": "上班", "10:00": "上班", ...}}
  ],
  "suggestions": [
    {"text": "谷贺今晚也空，要约饭吗？", "action": "invite", "dateKey": "...", "slot": "18:00", "peer": "谷贺"}
  ],
  "callouts": ["王宏康今天全天都在忙", "谷贺周四有约会💕"]
}

规则：
- 上班默认9:00-18:00，加班则延长到用户说的时间
- 个人模式时 callouts 和 suggestions 必须为空数组
- 日期范围：${dates[0].getMonth() + 1}月${dates[0].getDate()}日 ~ ${dates[6].getMonth() + 1}月${dates[6].getDate()}日
- dateKey格式用YYYY-MM-DD，slots的key用HH:00格式
- 回复简洁，200字以内`;

    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${context}\n\n用户说：${message}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json() as any;
    if (data.error) {
      console.error('DeepSeek error:', data.error);
      return res.status(500).json({ error: data.error.message || 'AI 调用失败' });
    }

    const aiText = data.choices?.[0]?.message?.content || '';
    // 尝试提取 JSON
    let result;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: aiText, plans: [], suggestions: [], callouts: [] };
    } catch {
      result = { reply: aiText, plans: [], suggestions: [], callouts: [] };
    }

    res.json(result);
  } catch (err: any) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: err.message });
  }
});

function getMondayForThisWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default app;
