import type { DateKey } from '../types';
import { getWeekDates, toDateKey } from './time';

export interface ParsedPlan {
  dateKey: DateKey;
  dateLabel: string;
  slots: Record<string, string>;
  suggestions: string[];
}

// ── 星期映射 ──
const DAY_MAP: Record<string, number> = {
  '周一': 0, '星期一': 0, '礼拜一': 0,
  '周二': 1, '星期二': 1, '礼拜二': 1,
  '周三': 2, '星期三': 2, '礼拜三': 2,
  '周四': 3, '星期四': 3, '礼拜四': 3,
  '周五': 4, '星期五': 4, '礼拜五': 4,
  '周六': 5, '星期六': 5, '礼拜六': 5,
  '周日': 6, '星期日': 6, '礼拜天': 6, '星期天': 6, '礼拜日': 6,
};

// ── 时段映射 ──
const TIME_MAP: Record<string, [number, number]> = {
  '上午': [8, 12], '早上': [8, 12],
  '下午': [13, 18],
  '晚上': [18, 22], '傍晚': [18, 22],
  '全天': [8, 22], '一整天': [8, 22],
  '中午': [12, 14],
};

// ── 活动映射 ──
const ACT_MAP: [string[], string][] = [
  [['上班', '工作', '搬砖', '打工', '加班'], '上班'],
  [['开会', '会议', '例会'], '开会'],
  [['出差', '外勤'], '出差'],
  [['带娃', '带孩子', '看孩子', '带小孩'], '带娃'],
  [['约会', 'date', '见面'], '约会'],
  [['健身', '运动', '跑步', '锻炼', '游泳', '打球'], '健身'],
  [['吃饭', '约饭', '火锅', '日料', '烧烤', '聚餐', '晚餐', '午饭', '吃', '饭'], '吃饭'],
  [['学习', '上课', '看书', '写作业'], '学习'],
  [['睡觉', '睡'], '睡觉'],
  [['爬山', '徒步', '登山', '爬'], '爬山'],
  [['看电影', '影院', '电影'], '看电影'],
  [['逛街', '购物', '买东西', '商场'], '逛街'],
  [['喝酒', '酒吧', '小酌', '酒', '喝'], '喝酒'],
  [['旅游', '旅行', '出行', '出游'], '旅游'],
  [['开车', '自驾'], '开车'],
  [['咖啡', '下午茶', '喝茶', '茶'], '咖啡'],
  [['唱歌', 'KTV', 'ktv'], '唱歌'],
  [['桌游', '剧本杀', '狼人杀', '麻将', '打牌'], '桌游'],
  [['打游戏', '游戏', '电竞'], '打游戏'],
  [['医院', '看病', '体检'], '医院'],
  [['逛街', '购物', '买东西', '商场'], '逛街'],
];

const FREE_WORDS = ['休息', '空闲', '没事', '自由', '空着', '宅家', '在家', '放松'];

// 活动默认时段
const ACT_DEFAULT: Record<string, [number, number]> = {
  '上班': [9, 18], '开会': [9, 18], '出差': [8, 22],
  '带娃': [8, 22], '约会': [18, 22], '健身': [18, 20],
  '吃饭': [18, 20], '学习': [19, 22], '睡觉': [22, 24],
  '爬山': [8, 18], '看电影': [19, 22], '逛街': [13, 18],
  '喝酒': [20, 24], '唱歌': [20, 24], '桌游': [14, 22],
  '打游戏': [20, 24], '医院': [9, 12], '咖啡': [14, 17],
  '开车': [8, 18], '旅游': [8, 22],
};

// ── 工具函数 ──

/** 解析日期间范围："周一到周五" → [0,1,2,3,4]，"周一和周二" → [0,1] */
function parseDayRange(text: string): number[] {
  const days = new Set<number>();

  // "周一到周五" "周一-周五" "周一至周五" → 范围
  const rangeMatch = text.match(/周([一二三四五六日])[到至\-~]([一二三四五六日])/);
  if (rangeMatch) {
    const start = DAY_MAP[`周${rangeMatch[1]}`];
    const end = DAY_MAP[`周${rangeMatch[2]}`];
    if (start !== undefined && end !== undefined) {
      for (let i = start; i <= end; i++) days.add(i);
      return Array.from(days).sort();
    }
  }

  // "周六日" "周六周日" → [5,6]
  if (/周六?日/.test(text)) { days.add(5); days.add(6); }

  // "周末" → [5,6]
  if (/周末/.test(text)) { days.add(5); days.add(6); }

  // "工作日" "周中" → [0,1,2,3,4]
  if (/工作[日天]/.test(text) || /周中/.test(text) || /周[一到五1-5]/.test(text)) {
    for (let i = 0; i <= 4; i++) days.add(i);
  }

  // 逐个匹配：周一、周二、周三...
  for (const [kw, idx] of Object.entries(DAY_MAP)) {
    if (text.includes(kw)) days.add(idx);
  }

  // 如果都没匹配到，默认今天起剩余日子
  if (days.size === 0) {
    const today = new Date().getDay();
    const startIdx = today === 0 ? 6 : today - 1;
    for (let i = startIdx; i < 7; i++) days.add(i);
  }

  return Array.from(days).sort();
}

/** 解析时间段 */
function parseTimeRange(text: string, activity: string): [number, number] | null {
  // "X点到Y点" / "X:00到Y:00"
  const exact = text.match(/(\d{1,2})[点:时](?:\d{2})?[到至\-~](\d{1,2})[点:时]?/);
  if (exact) return [parseInt(exact[1]), parseInt(exact[2])];

  // "加班到X点" → 9:00 到 X:00
  const ot = text.match(/加班到(\d{1,2})[点:时]/);
  if (ot && activity === '上班') return [9, parseInt(ot[1])];

  // "到X点" → 从默认开始时间到X
  const toX = text.match(/到(\d{1,2})[点:时]/);
  if (toX) {
    const defaultStart = ACT_DEFAULT[activity]?.[0] || 8;
    return [defaultStart, parseInt(toX[1])];
  }

  // 模糊时间
  for (const [kw, range] of Object.entries(TIME_MAP)) {
    if (text.includes(kw)) return range;
  }

  // 活动默认时间
  if (activity && ACT_DEFAULT[activity]) return ACT_DEFAULT[activity];

  return null;
}

/** 识别活动 */
function parseActivity(text: string): string {
  for (const [keywords, act] of ACT_MAP) {
    for (const kw of keywords) {
      if (text.includes(kw)) return act;
    }
  }
  return '';
}

/** 是空闲/休息 */
function isFree(text: string): boolean {
  return FREE_WORDS.some(w => text.includes(w));
}

// ── 主解析函数 ──

export function parseSchedule(input: string, monday: Date): {
  plans: ParsedPlan[];
  reminders: string[];
  unrecognized: string[];
} {
  const dates = getWeekDates(monday);
  const plans: Map<string, ParsedPlan> = new Map();
  const reminders: string[] = [];
  const unrecognized: string[] = [];

  for (const d of dates) {
    const dk = toDateKey(d);
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    plans.set(dk, { dateKey: dk, dateLabel: `${dayName} ${d.getMonth() + 1}/${d.getDate()}`, slots: {}, suggestions: [] });
  }

  // 按标点拆成独立句子
  const segments = input
    .split(/[，,。.!！；;、\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 1);

  if (segments.length === 0) segments.push(input.trim());

  for (const seg of segments) {
    const activity = parseActivity(seg);
    const free = isFree(seg);
    const dayRange = parseDayRange(seg);

    // 心愿 → 不占日程
    if (/想[去要]/.test(seg) && !/加班/.test(seg)) {
      const clean = seg.replace(/想[去要]?/, '').trim();
      if (clean) reminders.push(`💭 心愿：${clean}（未填入日程）`);
      continue;
    }

    // 空闲/休息 → 清除对应天数的时段
    if (free) {
      for (const idx of dayRange) {
        const d = dates[idx];
        if (!d) continue;
        const dk = toDateKey(d);
        plans.get(dk)!.slots = {};
      }
      continue;
    }

    // 有活动 → 填入
    if (activity) {
      const timeRange = parseTimeRange(seg, activity);
      if (!timeRange) {
        unrecognized.push(seg);
        continue;
      }

      const [startH, endH] = timeRange;

      // 上班且没明确指定具体日期 → 默认只填工作日
      let effectiveRange = dayRange;
      if (activity === '上班' && dayRange.length >= 5) {
        const hasSpecificDay = /周[一二三四五六日]/.test(seg) || /周[末六日]/.test(seg);
        if (!hasSpecificDay) effectiveRange = dayRange.filter(d => d <= 4);
      }

      for (const idx of effectiveRange) {
        const d = dates[idx];
        if (!d) continue;
        const dk = toDateKey(d);
        for (let h = startH; h < endH; h++) {
          const slot = `${String(h).padStart(2, '0')}:00`;
          plans.get(dk)!.slots[slot] = activity;
        }
      }
      continue;
    }

    // 什么都没识别到
    if (seg.length > 2 && !/休息|空闲|没事|自由|空着|宅家|在家|放松/.test(seg)) {
      unrecognized.push(seg);
    }
  }

  return {
    plans: Array.from(plans.values()).filter(p => Object.keys(p.slots).length > 0),
    reminders,
    unrecognized,
  };
}

// ── 空闲扫描 ──

export function scanFreeSlots(
  group: { members: string[]; schedules: Record<string, Record<string, Record<string, string>>> },
  currentMember: string,
  monday: Date,
): {
  suggestions: { dateKey: string; dateLabel: string; slot: string; timeLabel: string; freePeers: string[]; busyPeers: string[]; missingPeers: string[] }[];
  callouts: string[];
} {
  const dates = getWeekDates(monday);
  const members = group.members.filter(m => m !== currentMember);
  const suggestions: any[] = [];
  const callouts: string[] = [];

  // 合并连续空闲为区间
  for (const date of dates) {
    const dateKey = toDateKey(date);
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    const dateLabel = `${dayName} ${date.getMonth() + 1}/${date.getDate()}`;
    const mySched = group.schedules[currentMember]?.[dateKey] || {};
    const myBusy = new Set(Object.keys(mySched));

    // 找连续空闲区间（最小2小时）
    let freeStart = -1;
    for (let h = 8; h < 22; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      if (!myBusy.has(slot)) {
        if (freeStart === -1) freeStart = h;
      } else {
        if (freeStart !== -1 && h - freeStart >= 2) {
          checkPeers(freeStart, h, dateKey, dateLabel, members, group, suggestions);
        }
        freeStart = -1;
      }
    }
    if (freeStart !== -1 && 22 - freeStart >= 2) {
      checkPeers(freeStart, 22, dateKey, dateLabel, members, group, suggestions);
    }

    // 趣闻
    for (const m of members) {
      const s = group.schedules[m]?.[dateKey];
      if (!s) continue;
      const acts = Object.values(s);
      if (acts.includes('约会')) callouts.push(`👀 ${m} ${dateLabel} 有约会💕`);
      if (acts.filter(a => a !== '').length >= 10) callouts.push(`😮 ${m} ${dateLabel} 全天忙`);
    }
  }

  return { suggestions: suggestions.slice(0, 5), callouts: callouts.slice(0, 3) };
}

function checkPeers(startH: number, endH: number, dateKey: string, dateLabel: string, members: string[], group: any, suggestions: any[]) {
  const freePeers: string[] = [];
  const busyPeers: string[] = [];
  const missingPeers: string[] = [];

  for (const m of members) {
    const theirSched = group.schedules[m]?.[dateKey];
    if (!theirSched || Object.keys(theirSched).length === 0) {
      missingPeers.push(m);
      continue;
    }
    let allFree = true;
    for (let h = startH; h < endH; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      if (theirSched[slot]) { allFree = false; break; }
    }
    if (allFree) freePeers.push(m); else busyPeers.push(m);
  }

  if (freePeers.length > 0 || missingPeers.length > 0) {
    suggestions.push({
      dateKey, dateLabel,
      slot: `${String(startH).padStart(2, '0')}:00`,
      timeLabel: `${String(startH).padStart(2, '0')}:00-${String(endH).padStart(2, '0')}:00`,
      freePeers, busyPeers, missingPeers,
    });
  }
}

export function generateGreeting(
  group: { members: string[]; schedules: Record<string, Record<string, Record<string, string>>> },
  currentMember: string,
): string {
  const todayKey = toDateKey(new Date());
  const myToday = group.schedules[currentMember]?.[todayKey];
  const others = group.members.filter(m => m !== currentMember);

  if (!myToday || Object.keys(myToday).length === 0) {
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()];
    return `👋 你好！今天${dayName}有什么安排？`;
  }

  const missing = others.filter(m => {
    const s = group.schedules[m]?.[todayKey];
    return !s || Object.keys(s).length === 0;
  });

  if (missing.length > 0) {
    return `✅ 你的日程已记录。${missing.join('、')} 还没更新哦。`;
  }

  return '✅ 你的日程已记录。大家都更新了！';
}
