import { TIME_SLOTS } from '../types';

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toDateLabel(date: Date): string {
  const wd = WEEKDAY_NAMES[date.getDay()];
  return `${wd} ${date.getMonth() + 1}/${date.getDate()}`;
}

export function toDayName(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()];
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const wn = getWeekNumber(monday);
  const formatMD = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `第${wn}周 ${formatMD(monday)}-${formatMD(sunday)}`;
}

export function getAllTimeSlots(): readonly string[] {
  return TIME_SLOTS;
}

export function slotToHour(slot: string): number {
  return parseInt(slot.split(':')[0], 10);
}

/** 用于排序的数值：00:00 → 24（保证在最后） */
export function slotOrder(slot: string): number {
  const h = slotToHour(slot);
  return h === 0 ? 24 : h;
}

export function nextSlot(slot: string): string {
  const hour = slotToHour(slot) + 1;
  if (hour === 24) return '00:00';
  return `${String(hour).padStart(2, '0')}:00`;
}

/** 是工作日（周一~周五） */
export function isWeekday(date: Date): boolean {
  const d = date.getDay();
  return d >= 1 && d <= 5;
}

/** 是周末 */
export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

/** 是周末范围（周五~周日） */
export function isWeekendRange(date: Date): boolean {
  const d = date.getDay();
  return d === 5 || d === 6 || d === 0; // 周五、周六、周日
}
