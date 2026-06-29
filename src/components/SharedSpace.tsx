import { useState, useEffect } from 'react';
import type { Group } from '../types';
import { getWeekDates, toDateKey, toDayName } from '../utils/time';
import { TIME_SLOTS, PRESET_ACTIVITIES, getActivityEmoji } from '../types';

interface Props {
  group: Group;
  monday: Date;
}

const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b'];
const MEMBER_BG = ['#eef2ff', '#ecfdf5', '#fffbeb'];

export default function SharedSpace({ group, monday }: Props) {
  const dates = getWeekDates(monday);
  const todayKey = toDateKey(new Date());
  const nowHour = new Date().getHours();
  const members = group.members;

  const getActivity = (m: string, dateKey: string, slot: string): string =>
    group.schedules[m]?.[dateKey]?.[slot] || '';

  // 生成实时洞察
  const insights: { type: 'status' | 'free' | 'missing' | 'busy'; text: string; member?: string; color?: string }[] = [];

  for (const m of members) {
    const todaySched = group.schedules[m]?.[todayKey];
    if (!todaySched || Object.keys(todaySched).length === 0) {
      insights.push({ type: 'missing', text: `${m}今天还没签到`, member: m });
      continue;
    }

    // 当前在干嘛
    const nowSlot = `${String(nowHour).padStart(2, '0')}:00`;
    const nowAct = todaySched[nowSlot];
    if (nowAct) {
      const emoji = getActivityEmoji(nowAct);
      insights.push({ type: 'status', text: `${emoji} ${m}正在${nowAct}`, member: m, color: MEMBER_COLORS[members.indexOf(m)] });
    } else {
      insights.push({ type: 'free', text: `🟢 ${m}这会正空着`, member: m });
    }

    // 全天都忙
    const busyCount = Object.values(todaySched).filter(Boolean).length;
    if (busyCount >= 12) {
      insights.push({ type: 'busy', text: `😮 ${m}今天全天忙，辛苦了`, member: m });
    }
  }

  // 今天的共同空闲（18:00 之后）
  const eveningSlots = TIME_SLOTS.filter(s => { const h = parseInt(s); return h >= 18 && h < 22; });
  const eveningFree = eveningSlots.map(slot => {
    const free = members.filter(m => !getActivity(m, todayKey, slot));
    return { slot, free, allFree: free.length === members.length };
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
      {/* ====== 左侧：AI 洞察 ====== */}
      <div style={{ width: 200, minWidth: 200, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: '12px', overflowY: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>🤖 实时洞察</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8 }}>
          现在 {String(nowHour).padStart(2, '0')}:00
        </div>
        {insights.map((ins, i) => (
          <div key={i} style={{
            padding: '8px 10px', marginBottom: 6, borderRadius: 'var(--radius-sm)',
            background: ins.type === 'status' ? `${ins.color}10` : ins.type === 'free' ? '#f0fdf4' : ins.type === 'missing' ? '#fef3c7' : '#fef2f2',
            border: `1px solid ${ins.type === 'status' ? ins.color + '30' : ins.type === 'free' ? '#86efac' : ins.type === 'missing' ? '#fde68a' : '#fecaca'}`,
            fontSize: 11, lineHeight: 1.5,
          }}>
            {ins.text}
          </div>
        ))}

        {/* 晚间共同空闲 */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>💡 今晚共同空闲</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {eveningFree.map(({ slot, free, allFree }) => (
              <div key={slot} style={{
                padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10,
                background: allFree ? '#d1fae5' : free.length >= 2 ? '#fef3c7' : '#fee2e2',
                color: allFree ? '#065f46' : free.length >= 2 ? '#92400e' : '#991b1b',
                fontWeight: allFree ? 700 : 400,
              }}>
                {slot} {allFree ? '🎉全空' : `${free.length}人`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== 右侧：三人时间线 ====== */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          今天 {new Date().getMonth() + 1}/{new Date().getDate()} · 实时状态
        </div>

        {members.map((m, mi) => {
          const todaySched = group.schedules[m]?.[todayKey];
          const hasData = todaySched && Object.keys(todaySched).length > 0;
          const nowSlot = `${String(nowHour).padStart(2, '0')}:00`;
          const nowAct = todaySched?.[nowSlot] || '';
          const mood = group.moods?.[m]?.[todayKey] || '';

          return (
            <div key={m} style={{
              marginBottom: 10, padding: '10px 12px',
              borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)',
              border: `2px solid ${MEMBER_COLORS[mi]}20`,
              boxShadow: 'var(--shadow-xs)',
            }}>
              {/* 名字 + 状态 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  background: MEMBER_COLORS[mi], color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>{m[0]}</div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{m}</span>
                  {mood && <span style={{ marginLeft: 6, fontSize: 14 }}>{mood}</span>}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: hasData ? (nowAct ? '#f59e0b' : '#10b981') : '#d4d4d8',
                  }} />
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {!hasData ? '未签到' : nowAct ? `正在${nowAct}` : '空闲中'}
                  </span>
                </div>
              </div>

              {/* 今天的时间条 */}
              <div style={{ position: 'relative', height: 28, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {/* 色块 */}
                {hasData && TIME_SLOTS.filter(s => { const h = parseInt(s); return h >= 6 && h < 24; }).map(slot => {
                  const act = todaySched?.[slot];
                  const h = parseInt(slot);
                  const left = ((h - 6) / 18) * 100;
                  const width = (1 / 18) * 100;
                  if (!act) return null;
                  const actDef = PRESET_ACTIVITIES.find(a => a.key === act);
                  return (
                    <div key={slot} style={{
                      position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%',
                      background: actDef?.color || '#e9d5ff',
                      borderRight: '1px solid rgba(0,0,0,0.05)',
                    }} title={`${slot} ${act}`} />
                  );
                })}
                {/* 当前时间红线 */}
                <div style={{
                  position: 'absolute', left: `${((nowHour - 6) / 18) * 100}%`, top: 0, bottom: 0,
                  width: 2, background: '#ef4444', zIndex: 2,
                }} />
                {/* 时间标签 */}
                {[6, 9, 12, 15, 18, 21, 24].map(h => (
                  <div key={h} style={{ position: 'absolute', left: `${((h - 6) / 18) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.06)' }}>
                    <span style={{ position: 'absolute', top: -14, left: -10, fontSize: 9, color: 'var(--text-tertiary)' }}>{h}h</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 三人并排小日历 */}
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 4, minWidth: 400, fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            <div style={{ width: 32 }} />
            {dates.map(d => <div key={toDateKey(d)} style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>{toDayName(d)}</div>)}
          </div>
          {TIME_SLOTS.filter(s => { const h = parseInt(s); return h >= 8 && h < 22; }).map(slot => (
            <div key={slot} style={{ display: 'flex', gap: 4, alignItems: 'center', minHeight: 18 }}>
              <div style={{ width: 32, fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'right', paddingRight: 4 }}>{slot}</div>
              {dates.map(d => {
                const dk = toDateKey(d);
                const acts = members.map(m => getActivity(m, dk, slot));
                const freeCount = acts.filter(a => !a).length;
                const total = members.length;
                return (
                  <div key={dk} style={{
                    flex: 1, height: 18, borderRadius: 3,
                    background: freeCount === total ? '#d1fae5' : freeCount >= 2 ? '#fef3c7' : freeCount === 1 ? '#fed7aa' : '#fecaca',
                    border: `1px solid ${freeCount === total ? '#86efac' : freeCount >= 2 ? '#fde68a' : freeCount === 1 ? '#fb923c' : '#f87171'}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  }}>
                    {acts.filter(Boolean).map((a, i) => (
                      <span key={i} style={{ fontSize: 9 }} title={`${members[i]}: ${a}`}>{getActivityEmoji(a)}</span>
                    ))}
                    {freeCount === total && <span style={{ fontSize: 8, color: '#065f46' }}>全空</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
