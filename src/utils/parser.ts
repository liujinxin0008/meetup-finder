import type { DateKey } from '../types';
import { getWeekDates, toDateKey } from './time';

export interface ParsedPlan {
  dateKey: DateKey;
  dateLabel: string;
  slots: Record<string, string>;
  suggestions: string[];
}

const DAY_KEYWORDS: Record<string, number> = {
  '周一': 0, '星期1': 0, '星期一': 0, '礼拜一': 0,
  '周二': 1, '星期2': 1, '星期二': 1, '礼拜二': 1,
  '周三': 2, '星期3': 2, '星期三': 2, '礼拜三': 2,
  '周四': 3, '星期4': 3, '星期四': 3, '礼拜四': 3,
  '周五': 4, '星期5': 4, '星期五': 4, '礼拜五': 4,
  '周六': 5, '星期六': 5, '礼拜六': 5,
  '周日': 6, '星期7': 6, '星期日': 6, '礼拜天': 6, '星期天': 6, '礼拜日': 6, '星期6': 5,
};

const TIME_RANGES: Record<string, [number, number]> = {
  '上午': [8, 12], '早上': [8, 12], '早晨': [8, 12],
  '下午': [13, 18], '午后': [13, 18],
  '晚上': [18, 22], '傍晚': [18, 22], '夜间': [18, 24],
  '全天': [8, 22], '一整天': [8, 22], '一天': [8, 22],
  '中午': [12, 14], '午休': [12, 14],
};

const ACTIVITY_MAP: Record<string, string> = {
  '上班': '上班', '工作': '上班', '搬砖': '上班', '打工': '上班', '加班': '上班',
  '开会': '开会', '会议': '开会', '例会': '开会',
  '出差': '出差', '外勤': '出差',
  '带娃': '带娃', '带孩子': '带娃', '看孩子': '带娃', '带小孩': '带娃',
  '约会': '约会', 'date': '约会', '见面': '约会',
  '健身': '健身', '运动': '健身', '跑步': '健身', '锻炼': '健身', '游泳': '健身',
  '吃饭': '吃饭', '约饭': '吃饭', '火锅': '吃饭', '日料': '吃饭', '烧烤': '吃饭', '聚餐': '吃饭',
  '学习': '学习', '上课': '学习', '看书': '学习', '写作业': '学习',
  '有事': '有事', '忙': '有事',
  '休息': '', '空闲': '', '没事': '', '自由': '', '空着': '', '宅家': '', '在家': '',
  '睡觉': '睡觉', '睡': '睡觉',
  '爬山': '爬山', '徒步': '爬山', '登山': '爬山',
  '看电影': '看电影', '影院': '看电影', '电影': '看电影',
  '逛街': '逛街', '购物': '逛街', '买东西': '逛街', '商场': '逛街',
  '喝酒': '喝酒', '酒吧': '喝酒', '酒': '喝酒', '小酌': '喝酒', '小聚': '吃饭',
  '旅游': '旅游', '旅行': '旅游', '出行': '旅游',
  '开车': '开车', '自驾': '开车',
  '咖啡': '咖啡', '下午茶': '咖啡', '喝茶': '咖啡',
  '唱歌': '唱歌', 'KTV': '唱歌',
  '桌游': '桌游', '剧本杀': '桌游', '狼人杀': '桌游', '麻将': '桌游',
  '打游戏': '打游戏', '游戏': '打游戏',
  '医院': '医院', '看病': '医院', '体检': '医院',
  '宠物': '宠物', '遛狗': '宠物', '猫': '宠物',
};

// 每个活动的默认时段（当用户没说具体时间时）
const ACTIVITY_DEFAULT_TIMES: Record<string, [number, number]> = {
  '上班': [9, 18], '工作': [9, 18],
  '开会': [9, 18],
  '出差': [8, 22],
  '带娃': [8, 22],
  '约会': [18, 22],
  '健身': [18, 20], '运动': [18, 20],
  '吃饭': [18, 20],
  '学习': [19, 22],
  '睡觉': [22, 24],
  '爬山': [8, 18],
  '看电影': [19, 22],
  '逛街': [13, 18],
  '喝酒': [20, 24],
  '唱歌': [20, 24],
  '旅游': [8, 22],
  '咖啡': [14, 17],
  '桌游': [14, 22],
  '打游戏': [20, 24],
  '医院': [9, 12],
};

/** 从自然语言文本解析出本周的日程安排 */
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

  // 分割多个句子（按逗号、句号、空格分割独立语义单元）
  const segments = input
    .replace(/[，,]/g, '|')
    .replace(/[。.!！]/g, '|')
    .replace(/；/g, '|')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);

  if (segments.length === 0) segments.push(input.trim());

  for (const segment of segments) {
    parseSegment(segment, dates, plans, reminders, unrecognized);
  }

  return {
    plans: Array.from(plans.values()).filter(p => Object.keys(p.slots).length > 0),
    reminders,
    unrecognized,
  };
}

function parseSegment(
  text: string,
  dates: Date[],
  plans: Map<string, ParsedPlan>,
  reminders: string[],
  unrecognized: string[],
) {
  const original = text;
  text = text.toLowerCase();

  // ── 1. 找出日期范围 ──
  let dayRange: number[] = [];
  if (/工作[日天]/.test(text) || /周[一到五]/.test(text) || /周1.?5/.test(text)) {
    dayRange = [0, 1, 2, 3, 4];
  } else if (/周末/.test(text) || /周[六日末]/.test(text)) {
    dayRange = [5, 6];
  } else {
    for (const [kw, idx] of Object.entries(DAY_KEYWORDS)) {
      if (text.includes(kw)) dayRange.push(idx);
    }
  }
  // 没指定日期 → 影响本周所有日子（但每个活动有工作日/周末倾向）
  if (dayRange.length === 0) {
    for (let i = 0; i < 7; i++) dayRange.push(i);
  }

  // ── 2. 找出活动 ──
  let activity = '';
  for (const [keyword, act] of Object.entries(ACTIVITY_MAP)) {
    if (text.includes(keyword)) { activity = act; break; }
  }

  // ── 3. 找出时间段 ──
  let timeSpan: [number, number] | null = null;

  // 3a. 精确时间: "X点到Y点" "X:00到Y:00" "加班到X点"
  const exactMatch = text.match(/(\d{1,2})[点:时](?:\d{2})?[到至](\d{1,2})[点:时]?/);
  if (exactMatch) {
    timeSpan = [parseInt(exactMatch[1]), parseInt(exactMatch[2])];
  }

  // 3b. "加班到20点" → 上班延续到20点
  const overtimeMatch = text.match(/加班到(\d{1,2})[点:时]/);
  if (overtimeMatch && activity === '上班') {
    timeSpan = [9, parseInt(overtimeMatch[1])]; // 9:00 到加班结束时间
  }

  // 3c. 模糊时间: 上午/下午/晚上
  if (!timeSpan) {
    for (const [kw, range] of Object.entries(TIME_RANGES)) {
      if (text.includes(kw)) { timeSpan = range; break; }
    }
  }

  // 3d. 用活动的默认时段
  if (!timeSpan && activity) {
    timeSpan = ACTIVITY_DEFAULT_TIMES[activity] || null;
  }

  // 3e. 兜底：全天
  if (!timeSpan) timeSpan = [8, 22];

  // ── 4. 心愿/想去 → 不填日程 ──
  if (/想[去要]/.test(original)) {
    const clean = original.replace(/想[去要]?/, '').trim();
    if (clean) {
      reminders.push(`💭 心愿：${clean}（未添加到日程）`);
    }
    return;
  }

  // ── 5. 填充日程 ──
  if (!activity) {
    if (original.length > 3 && !/休息|空闲|没事|自由|空着|宅家/.test(original)) {
      unrecognized.push(original);
    }
    return;
  }

  // "休息/空闲" → 清除时段（activity 为空字符串）
  const clearMode = activity === '';

  // 如果是上班且没指定日期 → 默认只在工作日
  let effectiveDayRange = dayRange;
  if (activity === '上班' && !/周[一二三四五六日]|星期|礼拜|周末|工作/.test(original)) {
    effectiveDayRange = dayRange.filter(d => d <= 4); // Mon-Fri
  }

  for (const dayIdx of effectiveDayRange) {
    const d = dates[dayIdx];
    if (!d) continue;
    const dk = toDateKey(d);
    const plan = plans.get(dk)!;
    const [startH, endH] = timeSpan!;

    for (let h = startH; h < endH; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      if (clearMode) {
        delete plan.slots[slot];
      } else {
        plan.slots[slot] = activity;
      }
    }
  }
}

/** 扫描空闲时段，匹配其他人的状态 */
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

  for (const date of dates) {
    const dateKey = toDateKey(date);
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    const dateLabel = `${dayName} ${date.getMonth() + 1}/${date.getDate()}`;

    const mySchedule = group.schedules[currentMember]?.[dateKey] || {};
    const myBusy = new Set(Object.keys(mySchedule));

    for (let h = 8; h < 22; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      if (myBusy.has(slot)) continue;

      const freePeers: string[] = [];
      const busyPeers: string[] = [];
      const missingPeers: string[] = [];

      for (const m of members) {
        const theirSched = group.schedules[m]?.[dateKey];
        if (!theirSched || Object.keys(theirSched).length === 0) {
          missingPeers.push(m);
        } else if (!theirSched[slot]) {
          freePeers.push(m);
        } else {
          busyPeers.push(m);
        }
      }

      if (freePeers.length > 0 && suggestions.length < 5) {
        suggestions.push({ dateKey, dateLabel, slot, timeLabel: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`, freePeers, busyPeers, missingPeers });
      }
    }

    for (const m of members) {
      const theirSched = group.schedules[m]?.[dateKey];
      if (!theirSched) continue;
      const theirActs = Object.values(theirSched);
      if (theirActs.includes('约会')) callouts.push(`👀 ${m}${dateLabel}有约会💕`);
      const busySlots = Object.keys(theirSched).length;
      if (busySlots >= 10) callouts.push(`😮 ${m}${dateLabel}全天都在忙`);
    }
  }

  return { suggestions, callouts: callouts.slice(0, 3) };
}

export function generateGreeting(
  group: { members: string[]; schedules: Record<string, Record<string, Record<string, string>>> },
  currentMember: string,
): string {
  const todayKey = toDateKey(new Date());
  const myToday = group.schedules[currentMember]?.[todayKey];
  const memberNames = group.members.filter(m => m !== currentMember);

  if (!myToday || Object.keys(myToday).length === 0) {
    const todayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()];
    return `👋 你好！今天${todayName}有什么安排？`;
  }

  const missing = memberNames.filter(m => {
    const s = group.schedules[m]?.[todayKey];
    return !s || Object.keys(s).length === 0;
  });

  if (missing.length > 0) {
    return `✅ 你的日程已记录。${missing.join('、')}今天还没更新哦`;
  }

  return '✅ 日程已记录。大家都更新了！';
}
