import type { Group, DateKey } from '../types';
import { TIME_SLOTS, getActivityEmoji } from '../types';
import { getWeekDates, toDateKey, toDayName } from '../utils/time';

interface OverviewGridProps { group: Group; monday: Date; }

const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b'];
const MEMBER_EMOJIS = ['😎', '🤩', '🥳'];

// 连续热力图：全空→全忙 的渐变
function heatmapColor(freeCount: number, total: number): { bg: string; text: string; indicator: string } {
  const ratio = freeCount / total;
  // 从薄荷绿渐变到珊瑚粉
  if (ratio >= 1) return { bg: '#d1fae5', text: '#065f46', indicator: '#10b981' };
  if (ratio >= 0.66) return { bg: '#e5f7e0', text: '#166534', indicator: '#22c55e' };
  if (ratio >= 0.5) return { bg: '#fef9c3', text: '#854d0e', indicator: '#eab308' };
  if (ratio >= 0.33) return { bg: '#fef0d5', text: '#9a3412', indicator: '#f97316' };
  return { bg: '#fee2e2', text: '#991b1b', indicator: '#ef4444' };
}

export default function OverviewGrid({ group, monday }: OverviewGridProps) {
  const dates = getWeekDates(monday);
  const todayKey = toDateKey(new Date());
  const { members, schedules } = group;

  const getActivity = (member: string, dateKey: DateKey, slot: string): string =>
    schedules[member]?.[dateKey]?.[slot] || '';

  const getFreeCount = (dateKey: DateKey, slot: string): number =>
    members.filter(m => !getActivity(m, dateKey, slot)).length;

  const getBusyInfo = (dateKey: DateKey, slot: string) =>
    members.filter(m => getActivity(m, dateKey, slot));

  return (
    <div style={{ padding: '8px 12px' }}>
      {/* ====== 成员横向名片 ====== */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 10,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        paddingBottom: 2,
      }}>
        {members.map((m, i) => {
          const todayMood = group.moods?.[m]?.[todayKey] || '';
          const color = MEMBER_COLORS[i];
          return (
            <div key={m} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow-card)',
              flexShrink: 0,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
                boxShadow: `0 3px 8px ${color}30`,
              }}>{MEMBER_EMOJIS[i]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{m}</div>
                {todayMood && (
                  <div style={{ fontSize: 16, marginTop: 1 }}>{todayMood}</div>
                )}
                {!todayMood && (
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>未签到</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ====== 图例 ====== */}
      <div style={{
        display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-secondary)',
        marginBottom: 10, flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
        padding: '8px 12px', boxShadow: 'var(--shadow-xs)',
      }}>
        <span style={{ fontWeight: 600, fontSize: 10, color: 'var(--text-tertiary)', marginRight: 2 }}>空闲人数</span>
        <HeatmapLegend color="#d1fae5" dotColor="#10b981" label="全空" />
        <HeatmapLegend color="#e5f7e0" dotColor="#22c55e" label="2人" />
        <HeatmapLegend color="#fef9c3" dotColor="#eab308" label="1~2人" />
        <HeatmapLegend color="#fef0d5" dotColor="#f97316" label="1人" />
        <HeatmapLegend color="#fee2e2" dotColor="#ef4444" label="全忙" />
      </div>

      {/* ====== 热力图表格 ====== */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {/* 表头 */}
        <div style={{
          display: 'flex', background: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 44, flexShrink: 0, padding: '5px 2px',
            fontSize: 10, color: 'var(--text-tertiary)',
            textAlign: 'center', fontWeight: 600,
          }}>时间</div>
          {dates.map(date => {
            const dk = toDateKey(date);
            const isToday = dk === todayKey;
            return (
              <div key={dk} style={{
                flex: 1, minWidth: 44, padding: '6px 2px',
                textAlign: 'center', position: 'relative',
              }}>
                {isToday && (
                  <div style={{
                    position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
                    width: 5, height: 5, borderRadius: '50%', background: '#6366f1',
                  }} />
                )}
                <div style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 600,
                  color: isToday ? 'var(--primary)' : 'var(--text-primary)',
                }}>{toDayName(date)}</div>
                <div style={{
                  fontSize: 10, color: isToday ? 'var(--primary-light)' : 'var(--text-tertiary)',
                }}>{date.getMonth()+1}/{date.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* 表格行 */}
        <div style={{ overflowX: 'auto', padding: '2px 0' }}>
          {TIME_SLOTS.map(slot => (
            <div key={slot} style={{
              display: 'flex', alignItems: 'center',
              borderBottom: '1px solid var(--border-subtle)',
              minHeight: 34,
            }}>
              <div style={{
                width: 44, flexShrink: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'var(--text-tertiary)',
                fontWeight: 500, fontFamily: 'var(--font-display)',
              }}>
                {slot}
              </div>
              {dates.map(date => {
                const dk = toDateKey(date);
                const freeCount = getFreeCount(dk, slot);
                const busy = getBusyInfo(dk, slot);
                const { bg, text, indicator } = heatmapColor(freeCount, members.length);

                return (
                  <div key={dk} style={{
                    flex: 1, minWidth: 44, height: 34, margin: 2,
                    borderRadius: 'var(--radius-sm)',
                    background: bg,
                    border: `1.5px solid ${indicator}30`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, gap: 1, padding: 1,
                    position: 'relative',
                  }}>
                    {/* 空闲人数标签 */}
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: text,
                      fontFamily: 'var(--font-display)',
                    }}>
                      {freeCount}/{members.length}
                    </span>
                    {/* 忙的人显示 emoji */}
                    {busy.length > 0 && (
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {busy.map(b => (
                          <span key={b} title={`${b}: ${getActivity(b, dk, slot)}`} style={{ fontSize: 11 }}>
                            {getActivityEmoji(getActivity(b, dk, slot))}
                          </span>
                        ))}
                      </div>
                    )}
                    {busy.length === 0 && (
                      <span style={{ fontSize: 11, color: text }}>全空</span>
                    )}
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

function HeatmapLegend({ color, dotColor, label }: { color: string; dotColor: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: dotColor, display: 'inline-block',
      }} />
      {label}
    </span>
  );
}
