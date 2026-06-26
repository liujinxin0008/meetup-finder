import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { findGroup, saveGroup } from './db.js';
import type { Group } from '../src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 确保数据目录存在
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());

// API 路由

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

    // 初始化每个成员的日程
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

// 正式环境：serve 前端静态文件
const staticDir = path.join(__dirname, '..', 'dist');
app.use(express.static(staticDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
