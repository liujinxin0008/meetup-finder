import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Group } from '../src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Netlify Functions 使用 /tmp，本地使用相对路径
const DATA_DIR = process.env.NETLIFY
  ? '/tmp/data'
  : path.join(__dirname, 'data');

interface Schema {
  groups: Group[];
}

const defaultData: Schema = { groups: [] };

// 使用工厂函数确保每次获取最新数据
function createDB(filePath: string): Low<Schema> {
  const adapter = new JSONFile<Schema>(filePath);
  return new Low<Schema>(adapter, defaultData);
}

export function getDB(groupId?: string) {
  if (!groupId) {
    // 全局数据库（用于创建新群组）
    const filePath = path.join(DATA_DIR, '_index.json');
    return createDB(filePath);
  }
  // 每个群组独立文件
  const filePath = path.join(DATA_DIR, `${groupId}.json`);
  return createDB(filePath);
}

export async function findGroup(id: string): Promise<Group | null> {
  // 先在索引中查找
  const indexDB = getDB();
  await indexDB.read();
  const group = indexDB.data.groups.find(g => g.id === id);
  if (!group) return null;

  // 加载群组完整数据
  const groupDB = getDB(id);
  await groupDB.read();
  return groupDB.data.groups[0] || null;
}

export async function saveGroup(group: Group): Promise<void> {
  // 存到独立文件
  const groupDB = getDB(group.id);
  await groupDB.read();
  groupDB.data.groups = [group];
  await groupDB.write();

  // 更新索引
  const indexDB = getDB();
  await indexDB.read();
  const idx = indexDB.data.groups.findIndex(g => g.id === group.id);
  const summary = {
    id: group.id,
    name: group.name,
    members: group.members,
    createdAt: group.createdAt,
    schedules: {}, // 索引不存完整 schedules
  } as Group;
  if (idx >= 0) {
    indexDB.data.groups[idx] = summary;
  } else {
    indexDB.data.groups.push(summary);
  }
  await indexDB.write();
}
