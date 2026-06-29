import type { DateKey, DaySchedule } from '../types';
import { getMonday, getWeekDates, toDateKey } from './time';

export interface ParsedPlan {
  dateKey: DateKey;
  dateLabel: string;     // "周三 6/28"
  slots: Record<string, string>; // slot → 活动
  suggestions: string[]; // 给用户的建议
}

const DAY_KEYWORDS: Record<string, number> = {
  '周一': 0, '星期1': 0, '星期一': 0, '礼拜一': 0,
  '周二': 1, '星期2': 1, '星期二': 1, '礼拜二': 1,
  '周三': 2, '星期3': 2, '星期三': 2, '礼拜三': 2,
  '周四': 3, '星期4': 3, '星期四': 3, '礼拜四': 3,
  '周五': 4, '星期5': 4, '星期五': 4, '礼拜五': 4,
  '周六': 5, '星期6': 6, '星期六': 5, '礼拜六': 5,
  '周日': 6, '星期7': 6, '星期日': 6, '礼拜天': 6, '星期天': 6, '礼拜日': 6,
};

const TIME_RANGES: Record<string, [number, number]> = {
  '上午': [8, 12], '早上': [8, 12], '早晨': [8, 12],
  '下午': [13, 18], '午后': [13, 18],
  '晚上': [18, 22], '傍晚': [18, 22], '夜间': [18, 24],
  '全天': [8, 22], '一整天': [8, 22], '一天': [8, 22],
  '中午': [12, 14], '午休': [12, 14],
};

const ACTIVITY_MAP: Record<string, string> = {
  '上班': '上班', '工作': '上班', '搬砖': '上班', '打工': '上班',
  '开会': '开会', '会议': '开会', '例会': '开会',
  '出差': '出差', '外勤': '出差', '出去': '出差',
  '带娃': '带娃', '带孩子': '带娃', '看孩子': '带娃', '带小孩': '带娃',
  '约会': '约会', 'date': '约会', '见面': '约会',
  '健身': '健身', '运动': '健身', '跑步': '健身', '锻炼': '健身', '游泳': '健身',
  '吃饭': '吃饭', '约饭': '吃饭', '火锅': '吃饭', '日料': '吃饭', '烧烤': '吃饭', '聚餐': '吃饭',
  '学习': '学习', '上课': '学习', '看书': '学习', '写作业': '学习',
  '有事': '有事', '忙': '有事',
  '休息': '', '空闲': '', '没事': '', '自由': '', '空着': '', '宅家': '', '在家': '',
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

  // 初始化所有天的空计划
  for (const d of dates) {
    const dk = toDateKey(d);
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    plans.set(dk, { dateKey: dk, dateLabel: `${dayName} ${d.getMonth() + 1}/${d.getDate()}`, slots: {}, suggestions: [] });
  }

  const text = input.toLowerCase().replace(/，/g, ',').replace(/。/g, '.').replace(/；/g, ';');

  // 1. 找出"工作日/周末"范围
  let dayRange: number[] | null = null;
  if (/工作[日天]/.test(text) || /周[一到五]/.test(text) || /周1.?5/.test(text)) {
    dayRange = [0, 1, 2, 3, 4]; // Mon-Fri
  } else if (/周末/.test(text) || /周[六日末]/.test(text)) {
    dayRange = [5, 6]; // Sat-Sun
  } else {
    // 找出所有提到的日期
    dayRange = [];
    for (const [kw, idx] of Object.entries(DAY_KEYWORDS)) {
      if (text.includes(kw)) dayRange.push(idx);
    }
  }

  // 如果没找到具体日期，默认今天开始的剩余日子
  if (dayRange.length === 0) {
    const todayIdx = new Date().getDay();
    const startIdx = todayIdx === 0 ? 6 : todayIdx - 1; // Monday = 0
    for (let i = startIdx; i < 7; i++) dayRange.push(i);
  }

  // 2. 解析时间段
  let timeSpan: [number, number] | null = null;
  // 精确时间: "X点到Y点" "X:00到Y:00" "X时到Y时"
  const exactMatch = text.match(/(\d{1,2})[点:时](?:\d{2})?到(\d{1,2})[点:时]/);
  if (exactMatch) {
    timeSpan = [parseInt(exactMatch[1]), parseInt(exactMatch[2])];
  } else {
    // 模糊时间: 上午/下午/晚上
    for (const [kw, range] of Object.entries(TIME_RANGES)) {
      if (text.includes(kw)) { timeSpan = range; break; }
    }
  }
  if (!timeSpan) timeSpan = [8, 22]; // 默认全天

  // 3. 解析活动
  let activity = '';
  const words = input.replace(/[想去要]/g, ''); // 去掉"想去""要"
  for (const [keyword, act] of Object.entries(ACTIVITY_MAP)) {
    if (input.includes(keyword)) { activity = act; break; }
  }
  // 如果没匹配到预设，尝试提取关键词
  if (!activity && input.length < 20) {
    // 短文本可能是自定义活动
    const trimmed = input.trim().replace(/[，,。.!！?？\s]/g, '');
    if (trimmed.length <= 6) activity = trimmed;
  }

  // 4. 填充日程
  for (const dayIdx of dayRange) {
    const d = dates[dayIdx];
    if (!d) continue;
    const dk = toDateKey(d);
    const plan = plans.get(dk)!;

    const [startH, endH] = timeSpan;
    for (let h = startH; h < endH; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      plan.slots[slot] = activity;
    }
  }

  // 5. 解析"想去/想" → 心愿提醒
  const wishMatch = input.match(/想[去要]?(.+?)(?:[，,。.!！]|$)/g);
  if (wishMatch) {
    for (const w of wishMatch) {
      const clean = w.replace(/想[去要]?/, '').trim();
      if (clean && clean.length < 30) {
        reminders.push(`💭 心愿：${clean}（未添加到日程）`);
      }
    }
  }

  // 6. 未识别的文本
  if (!activity && input.trim().length > 10 && reminders.length === 0) {
    unrecognized.push(input.trim());
  }

  return {
    plans: Array.from(plans.values()).filter(p => Object.keys(p.slots).length > 0),
    reminders,
    unrecognized,
  };
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

    // 找当前用户的空闲连续区间
    for (let h = 8; h < 22; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      if (myBusy.has(slot)) continue;

      // 检查其他人
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
        suggestions.push({
          dateKey, dateLabel, slot,
          timeLabel: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`,
          freePeers, busyPeers, missingPeers,
        });
      }
    }

    // 有趣/八卦的提醒
    for (const m of members) {
      const theirSched = group.schedules[m]?.[dateKey];
      if (!theirSched) continue;
      const theirActs = Object.values(theirSched);
      if (theirActs.includes('约会')) {
        callouts.push(`👀 ${m}${dateLabel}有约会💕`);
      }
      // 全天都在忙
      const busySlots = Object.keys(theirSched).length;
      if (busySlots >= 10) {
        callouts.push(`😮 ${m}${dateLabel}全天都在忙`);
      }
    }
  }

  return { suggestions, callouts: callouts.slice(0, 3) };
}

/** 生成助手的第一句话——根据当前状态智能打招呼 */
export function generateGreeting(
  group: { members: string[]; schedules: Record<string, Record<string, Record<string, string>>> },
  currentMember: string,
): string {
  const todayKey = toDateKey(new Date());
  const myToday = group.schedules[currentMember]?.[todayKey];
  const memberNames = group.members.filter(m => m !== currentMember);

  if (!myToday || Object.keys(myToday).length === 0) {
    // 还没填今天
    const todayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()];
    return `👋 你好！今天${todayName}有什么安排？`;
  }

  // 已经填了，看看其他人的状态
  const missing = memberNames.filter(m => {
    const s = group.schedules[m]?.[todayKey];
    return !s || Object.keys(s).length === 0;
  });

  if (missing.length > 0) {
    return `✅ 你的日程已记录。${missing.join('、')}今天还没更新哦`;
  }

  return '✅ 你的日程已记录。大家都更新了，干得漂亮！';
}
