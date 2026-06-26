import type { Group, DateKey, SceneCategory, SceneSuggestion } from '../types';
import { TIME_SLOTS, SCENE_CATEGORIES } from '../types';
import { getWeekDates, toDateKey, toDateLabel, slotToHour, slotOrder, nextSlot, isWeekday, isWeekend, isWeekendRange } from './time';

/** 获取某人在某天的空闲时段列表 */
function getFreeSlots(
  group: Group,
  member: string,
  dateKey: DateKey
): Set<string> {
  const daySchedule = group.schedules[member]?.[dateKey] || {};
  const busy = new Set(Object.keys(daySchedule));
  const free = new Set<string>();
  for (const slot of TIME_SLOTS) {
    if (!busy.has(slot)) free.add(slot);
  }
  return free;
}

/** 获取多人共同的空闲时段（交集） */
function getCommonFreeSlots(
  group: Group,
  members: string[],
  dateKey: DateKey
): Set<string> {
  if (members.length === 0) return new Set();
  const free = getFreeSlots(group, members[0], dateKey);
  for (let i = 1; i < members.length; i++) {
    const otherFree = getFreeSlots(group, members[i], dateKey);
    for (const slot of free) {
      if (!otherFree.has(slot)) free.delete(slot);
    }
  }
  return free;
}

/** 把空闲时段合并为连续区间 */
function mergeSlotsToRanges(slots: Set<string>): { start: string; end: string }[] {
  const sorted = Array.from(slots).sort((a, b) => slotOrder(a) - slotOrder(b));
  if (sorted.length === 0) return [];

  const ranges: { start: string; end: string }[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === nextSlot(prev)) {
      prev = sorted[i];
    } else {
      ranges.push({ start, end: nextSlot(prev) });
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push({ start, end: nextSlot(prev) });
  return ranges;
}

/** 对某个场景，匹配本周所有符合条件的时间段 */
export function matchScene(
  group: Group,
  monday: Date,
  scene: SceneCategory
): SceneSuggestion[] {
  const dates = getWeekDates(monday);
  const results: SceneSuggestion[] = [];
  const members = group.members;

  // 假期旅行场景：需要跨天匹配
  if (scene.id === 'holiday-trip') {
    return matchHolidayTrip(group, monday, scene);
  }

  for (const date of dates) {
    const dateKey = toDateKey(date);

    // 检查日期的周几是否符合场景要求
    // 周中小聚：仅工作日
    if (scene.id === 'weekday-evening' && !isWeekday(date)) continue;
    // 周末场景：周五~周日
    if ((scene.id === 'weekend-relax' || scene.id === 'weekend-outdoor') && !isWeekendRange(date)) continue;

    // 获取所有成员的空闲时段
    const commonFree = getCommonFreeSlots(group, members, dateKey);

    // 过滤出场景允许的时间段
    const sceneFree = new Set<string>();
    for (const slot of commonFree) {
      if (scene.slotFilter(date, slot)) {
        sceneFree.add(slot);
      }
    }

    // 合并为连续区间
    const ranges = mergeSlotsToRanges(sceneFree);

    for (const r of ranges) {
      const duration = slotToHour(r.end) - slotToHour(r.start);
      if (duration >= scene.minDuration) {
        // 如果超过 maxDuration，裁剪
        let endSlot = r.end;
        if (duration > scene.maxDuration) {
          const endHour = slotToHour(r.start) + scene.maxDuration;
          endSlot = `${String(endHour).padStart(2, '0')}:00`;
        }

        // 确定谁有空谁忙
        const available: string[] = [];
        const busy: string[] = [];
        for (const m of members) {
          const mFree = getFreeSlots(group, m, dateKey);
          let allFree = true;
          let s = r.start;
          const checkEnd = endSlot;
          while (s !== checkEnd) {
            if (!mFree.has(s)) { allFree = false; break; }
            s = nextSlot(s);
          }
          if (allFree) available.push(m);
          else busy.push(m);
        }

        if (available.length >= scene.minPeople) {
          results.push({
            categoryId: scene.id,
            categoryTitle: scene.title,
            date: dateKey,
            dateLabel: toDateLabel(date),
            startSlot: r.start,
            endSlot: endSlot,
            duration: slotToHour(endSlot) - slotToHour(r.start),
            availableCount: available.length,
            available,
            busy,
            activities: scene.activities,
          });
        }
      }
    }
  }

  // 排序：人数多 > 时间长 > 日期早
  results.sort((a, b) => {
    if (a.availableCount !== b.availableCount) return b.availableCount - a.availableCount;
    if (a.duration !== b.duration) return b.duration - a.duration;
    return a.date.localeCompare(b.date);
  });

  return results;
}

/** 假期旅行：匹配连续多天都空闲（只看白天时段 8:00-20:00） */
function matchHolidayTrip(
  group: Group,
  monday: Date,
  scene: SceneCategory
): SceneSuggestion[] {
  const dates = getWeekDates(monday);
  const members = group.members;
  const results: SceneSuggestion[] = [];

  // 只统计白天的时段（8:00-20:00），出来玩不算晚上睡觉时间
  const DAYTIME_SLOTS = new Set(
    TIME_SLOTS.filter(s => {
      const h = slotToHour(s);
      return h >= 8 && h < 20;
    })
  );

  // 计算每天的共同白天空闲小时数
  const dailyDaytime: { date: Date; dateKey: string; daytimeFree: number; totalFree: number; available: string[]; busy: string[] }[] = [];

  for (const date of dates) {
    const dateKey = toDateKey(date);
    const commonFree = getCommonFreeSlots(group, members, dateKey);
    const totalFree = commonFree.size;

    // 只算白天共同空闲
    let daytimeFree = 0;
    for (const slot of commonFree) {
      if (DAYTIME_SLOTS.has(slot)) daytimeFree++;
    }

    // 一个人当天算"有空出游"：白天至少 6 小时空闲
    const available: string[] = [];
    const busy: string[] = [];
    for (const m of members) {
      const mFree = getFreeSlots(group, m, dateKey);
      let mDaytime = 0;
      for (const slot of mFree) {
        if (DAYTIME_SLOTS.has(slot)) mDaytime++;
      }
      if (mDaytime >= 6) available.push(m);
      else busy.push(m);
    }

    dailyDaytime.push({ date, dateKey, daytimeFree, totalFree, available, busy });
  }

  // 找连续 2+ 天大家白天都有空的日子
  for (let start = 0; start < dates.length; start++) {
    if (dailyDaytime[start].available.length < scene.minPeople) continue;

    let totalDaytimeHours = dailyDaytime[start].daytimeFree;
    let end = start;
    for (let j = start + 1; j < dates.length; j++) {
      if (dailyDaytime[j].available.length >= scene.minPeople) {
        totalDaytimeHours += dailyDaytime[j].daytimeFree;
        end = j;
      } else {
        break;
      }
    }

    const days = end - start + 1;
    // 至少 2 天，且每天平均至少 4 小时白天共同空闲
    if (days >= 2 && totalDaytimeHours >= scene.minDuration) {
      const availableSet = new Set(dailyDaytime[start].available);
      for (let k = start + 1; k <= end; k++) {
        const dayAvail = new Set(dailyDaytime[k].available);
        for (const m of availableSet) {
          if (!dayAvail.has(m)) availableSet.delete(m);
        }
      }

      results.push({
        categoryId: scene.id,
        categoryTitle: scene.title,
        date: dailyDaytime[start].dateKey,
        dateLabel: `${toDateLabel(dates[start])} ~ ${toDateLabel(dates[end])}`,
        startSlot: '全天',
        endSlot: `${days}天`,
        duration: totalDaytimeHours,
        availableCount: availableSet.size,
        available: Array.from(availableSet),
        busy: members.filter(m => !availableSet.has(m)),
        activities: scene.activities,
      });

      start = end;
    }
  }

  results.sort((a, b) => b.duration - a.duration);
  return results;
}

export function formatTimeRange(start: string, end: string): string {
  if (start === '全天') return `${end}`;
  return `${start}-${end}`;
}
