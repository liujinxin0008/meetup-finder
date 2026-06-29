/** 时间段：一天 08:00~次日01:00，每小时一段 */
export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
  '23:00', '00:00',
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

/** 一天的日程：时间段 → 活动描述。空 map = 该天全空闲 */
export type DaySchedule = Record<string, string>;
// 例：{ "09:00": "上班", "10:00": "开会" }

/** 预设活动 */
export interface PresetActivity {
  key: string;
  emoji: string;
  label: string;
  color: string;
}

export const PRESET_ACTIVITIES: PresetActivity[] = [
  { key: '上班', emoji: '🏢', label: '上班', color: '#dbeafe' },
  { key: '开会', emoji: '📋', label: '开会', color: '#fecaca' },
  { key: '出差', emoji: '✈️', label: '出差', color: '#fed7aa' },
  { key: '带娃', emoji: '👶', label: '带娃', color: '#bfdbfe' },
  { key: '约会', emoji: '💕', label: '约会', color: '#fbcfe8' },
  { key: '健身', emoji: '🏃', label: '健身', color: '#bbf7d0' },
  { key: '吃饭', emoji: '🍜', label: '吃饭', color: '#fef08a' },
  { key: '学习', emoji: '📚', label: '学习', color: '#e9d5ff' },
  { key: '有事', emoji: '🔴', label: '有事', color: '#fca5a5' },
];

export function getActivityByKey(key: string): PresetActivity | undefined {
  return PRESET_ACTIVITIES.find(a => a.key === key);
}

export function getActivityEmoji(key: string): string {
  return getActivityByKey(key)?.emoji || '📝';
}

export function getActivityColor(key: string): string {
  return getActivityByKey(key)?.color || '#e2e8f0';
}

/** 心情 emoji 选项 */
export const MOOD_OPTIONS = ['😊', '😎', '😴', '😤', '🥳', '🏃', '💪', '😢', '🤔', '🥰', '😨', '🤯'];

/** 快捷事项模板 */
export interface QuickPlan {
  emoji: string;
  label: string;
  description: string;
  /** 生成当天日程（时间段 → 活动） */
  generate: () => DaySchedule;
}

export const QUICK_PLANS: QuickPlan[] = [
  {
    emoji: '🏢', label: '全天上班', description: '09:00-18:00',
    generate: () => {
      const s: DaySchedule = {};
      for (let h = 9; h < 18; h++) s[`${String(h).padStart(2, '0')}:00`] = '上班';
      return s;
    },
  },
  {
    emoji: '🌤️', label: '上午忙下午空', description: '09:00-12:00 上班',
    generate: () => {
      const s: DaySchedule = {};
      for (let h = 9; h < 12; h++) s[`${String(h).padStart(2, '0')}:00`] = '上班';
      return s;
    },
  },
  {
    emoji: '🌙', label: '上午空下午忙', description: '13:00-18:00',
    generate: () => {
      const s: DaySchedule = {};
      for (let h = 13; h < 18; h++) s[`${String(h).padStart(2, '0')}:00`] = '上班';
      return s;
    },
  },
  {
    emoji: '🏠', label: '全天休息', description: '自由安排',
    generate: () => ({}),
  },
  {
    emoji: '✈️', label: '出差', description: '整天在外',
    generate: () => {
      const s: DaySchedule = {};
      for (let h = 8; h < 22; h++) s[`${String(h).padStart(2, '0')}:00`] = '出差';
      return s;
    },
  },
  {
    emoji: '👶', label: '带娃', description: '全天带娃',
    generate: () => {
      const s: DaySchedule = {};
      for (let h = 8; h < 22; h++) s[`${String(h).padStart(2, '0')}:00`] = '带娃';
      return s;
    },
  },
  {
    emoji: '💕', label: '约会', description: '晚上~深夜',
    generate: () => {
      const s: DaySchedule = {};
      for (let h = 18; h <= 23; h++) s[`${String(h).padStart(2, '0')}:00`] = '约会';
      s['00:00'] = '约会';
      return s;
    },
  },
  {
    emoji: '📝', label: '其他', description: '自己填',
    generate: () => ({}), // 特殊处理，由 DailyCheckin 接管
  },
];

/** 群组数据结构 */
export interface Group {
  id: string;
  name: string;
  members: string[];
  schedules: Record<string, Record<string, DaySchedule>>;
  moods: Record<string, Record<string, string>>; // member → dateKey → emoji
  createdAt: string;
}

export type MemberKey = string;
export type DateKey = string;
export type TabId = 'my' | 'overview' | 'suggestions';

// ==================== 邀约系统 ====================

export interface Proposal {
  id: string;
  groupId: string;
  from: string;
  to: string[];
  dateKey: string;
  dateLabel: string;
  startSlot: string;
  endSlot: string;
  activity: string;
  note: string;
  responses: Record<string, 'yes' | 'no' | 'pending'>;
  createdAt: string;
}

// ==================== 场景分类 ====================

export interface ActivityIdea {
  emoji: string;
  title: string;
  desc: string;
  searchKeyword?: string; // 大众点评搜索关键词
}

export interface SceneCategory {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  /** 判断某个时间段是否在该场景的有效范围内 */
  slotFilter: (date: Date, slot: string) => boolean;
  minDuration: number;
  maxDuration: number;
  minPeople: number;
  activities: ActivityIdea[];
}

export const SCENE_CATEGORIES: SceneCategory[] = [
  {
    id: 'weekday-evening',
    icon: '🌆',
    title: '周中小聚',
    subtitle: '工作日晚上~凌晨，2~4小时',
    slotFilter: (_date, slot) => {
      const h = parseInt(slot);
      return h >= 17 || h === 0; // 17:00 ~ 次日01:00
    },
    minDuration: 2,
    maxDuration: 4,
    minPeople: 2,
    activities: [
      { emoji: '🍲', title: '火锅', desc: '热腾腾的火锅局', searchKeyword: '火锅' },
      { emoji: '🍣', title: '日料', desc: '寿司刺身来一套', searchKeyword: '日料' },
      { emoji: '🍖', title: '烧烤', desc: '烤肉撸串走起', searchKeyword: '烧烤' },
      { emoji: '🍺', title: '小酒馆', desc: '精酿/清吧小酌', searchKeyword: '小酒馆' },
      { emoji: '🎱', title: '桌游吧', desc: '狼人杀/剧本杀', searchKeyword: '桌游' },
      { emoji: '🎤', title: 'KTV', desc: '一起唱歌解压', searchKeyword: 'KTV' },
    ],
  },
  {
    id: 'weekend-relax',
    icon: '🌙',
    title: '周末放松',
    subtitle: '周五晚~周日，3~5小时',
    slotFilter: (date, slot) => {
      const d = date.getDay();
      const h = parseInt(slot);
      if (d === 5) return h >= 17;           // 周五：晚上开始
      if (d === 6) return true;              // 周六：全天
      if (d === 0) return h >= 8 && h <= 22; // 周日：白天到晚上
      return false;
    },
    minDuration: 3,
    maxDuration: 5,
    minPeople: 2,
    activities: [
      { emoji: '🥐', title: 'Brunch', desc: '睡到自然醒再约', searchKeyword: '早午餐' },
      { emoji: '🎬', title: '看电影', desc: 'IMAX/杜比刷一部', searchKeyword: '电影院' },
      { emoji: '🏠', title: '密室逃脱', desc: '一起烧脑解谜', searchKeyword: '密室逃脱' },
      { emoji: '🛍️', title: '逛街', desc: '商场/集市逛吃', searchKeyword: '购物中心' },
      { emoji: '🎵', title: 'LiveHouse', desc: '现场音乐走起', searchKeyword: 'LiveHouse' },
      { emoji: '🧘', title: 'SPA/按摩', desc: '放松身心', searchKeyword: 'SPA' },
    ],
  },
  {
    id: 'weekend-outdoor',
    icon: '🏕️',
    title: '周末出游',
    subtitle: '周五晚~周日，全天',
    slotFilter: (date, slot) => {
      const d = date.getDay();
      const h = parseInt(slot);
      if (d === 5) return h >= 17;           // 周五：晚上出发
      if (d === 6) return true;              // 周六：全天
      if (d === 0) return h >= 8 && h <= 22; // 周日：白天到晚上
      return false;
    },
    minDuration: 6,
    maxDuration: 12,
    minPeople: 2,
    activities: [
      { emoji: '🥾', title: '徒步', desc: '周边山野走一天', searchKeyword: '徒步路线' },
      { emoji: '⛺', title: '露营', desc: '帐篷篝火星空', searchKeyword: '露营地' },
      { emoji: '🚗', title: '短途自驾', desc: '周边古镇/山水', searchKeyword: '自驾游' },
      { emoji: '🍓', title: '采摘园', desc: '草莓/樱桃/葡萄', searchKeyword: '采摘园' },
      { emoji: '♨️', title: '温泉', desc: '泡汤放松一天', searchKeyword: '温泉' },
      { emoji: '🚴', title: '骑行', desc: '城市周边骑行', searchKeyword: '骑行路线' },
    ],
  },
  {
    id: 'holiday-trip',
    icon: '✈️',
    title: '假期旅行',
    subtitle: '连续 2 天以上空闲',
    slotFilter: () => true, // 全天可用
    minDuration: 48, // 2 天 = 48 小时（按可用时段算）
    maxDuration: 240,
    minPeople: 2,
    activities: [
      { emoji: '🚙', title: '长途自驾', desc: '3天以上自由行', searchKeyword: '自驾路线' },
      { emoji: '🏝️', title: '海边度假', desc: '阳光沙滩海鲜', searchKeyword: '海边度假' },
      { emoji: '🏘️', title: '古镇游', desc: '江南/西南古镇', searchKeyword: '古镇' },
      { emoji: '⛰️', title: '爬山', desc: '五岳/名山挑战', searchKeyword: '爬山' },
      { emoji: '🏙️', title: '城市探索', desc: '打卡新城市', searchKeyword: '旅游攻略' },
      { emoji: '🗺️', title: '自由行', desc: '说走就走的旅行', searchKeyword: '自由行' },
    ],
  },
];

/** 匹配建议项 */
export interface SceneSuggestion {
  categoryId: string;
  categoryTitle: string;
  date: DateKey;
  dateLabel: string;
  startSlot: string;
  endSlot: string;
  duration: number;
  availableCount: number;
  available: string[];
  busy: string[];
  activities: ActivityIdea[];
}
