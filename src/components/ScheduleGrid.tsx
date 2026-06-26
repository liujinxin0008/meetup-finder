import { useState, useCallback, useRef } from 'react';
import type { Group, DateKey, DaySchedule } from '../types';
import { TIME_SLOTS, PRESET_ACTIVITIES, getActivityEmoji, getActivityColor } from '../types';
import { getWeekDates, toDateKey, toDayName, slotToHour } from '../utils/time';
import { updateSchedule } from '../api';

interface ScheduleGridProps {
  group: Group;
  member: string;
  monday: Date;
  onGroupUpdate: (group: Group) => void;
}

function cellKey(dateKey: DateKey, slot: string) { return `${dateKey}|${slot}`; }
function parseCellKey(key: string) {
  const [dateKey, slot] = key.split('|');
  return { dateKey, slot };
}

const CELL_SIZE = 34; // 气泡格子的高度
const CELL_GAP = 2;

// 自定义标签配色（基于字符串哈希选择）
const CUSTOM_COLORS = [
  { bg: '#fce7f3', border: '#f9a8d4' },
  { bg: '#e0e7ff', border: '#a5b4fc' },
  { bg: '#d1fae5', border: '#6ee7b7' },
  { bg: '#fef3c7', border: '#fcd34d' },
  { bg: '#ede9fe', border: '#c4b5fd' },
  { bg: '#cffafe', border: '#67e8f9' },
  { bg: '#ffe4e6', border: '#fda4af' },
  { bg: '#f3e8ff', border: '#d8b4fe' },
];

function getCustomColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  return CUSTOM_COLORS[Math.abs(hash) % CUSTOM_COLORS.length];
}

export default function ScheduleGrid({ group, member, monday, onGroupUpdate }: ScheduleGridProps) {
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const isDragging = useRef(false);
  const [customLabel, setCustomLabel] = useState('');
  const [multiPanel, setMultiPanel] = useState(false);
  const [singlePanel, setSinglePanel] = useState<{
    dateKey: DateKey; slot: string; dateLabel: string;
  } | null>(null);

  const dates = getWeekDates(monday);
  const todayKey = toDateKey(new Date());

  const getActivity = (dateKey: DateKey, slot: string): string =>
    group.schedules[member]?.[dateKey]?.[slot] || '';

  const isSelected = (dateKey: DateKey, slot: string): boolean =>
    selection.has(cellKey(dateKey, slot));

  const batchSetActivity = useCallback(async (cells: { dateKey: DateKey; slot: string }[], activity: string) => {
    const newSchedules = { ...group.schedules };
    if (!newSchedules[member]) newSchedules[member] = {};
    const updatedDays = new Set<string>();

    for (const { dateKey, slot } of cells) {
      if (!newSchedules[member][dateKey]) {
        newSchedules[member][dateKey] = { ...(group.schedules[member]?.[dateKey] || {}) };
      } else {
        newSchedules[member][dateKey] = { ...newSchedules[member][dateKey] };
      }
      if (activity === '') delete newSchedules[member][dateKey][slot];
      else newSchedules[member][dateKey][slot] = activity;
      updatedDays.add(dateKey);
    }

    onGroupUpdate({ ...group, schedules: newSchedules });
    setSaving(true);
    try {
      for (const dateKey of updatedDays) {
        const daySchedule = newSchedules[member][dateKey];
        const result = await updateSchedule(group.id, member, dateKey, daySchedule);
        onGroupUpdate(result);
      }
    } catch { onGroupUpdate(group); }
    finally { setSaving(false); }
  }, [group, member, onGroupUpdate]);

  const handlePointerDown = (dateKey: DateKey, slot: string, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    isDragging.current = true;
    setSelection(new Set([cellKey(dateKey, slot)]));
  };

  const handlePointerEnter = (dateKey: DateKey, slot: string, e: React.PointerEvent) => {
    if (!isDragging.current || e.buttons === 0) { if (e.buttons === 0) isDragging.current = false; return; }
    setSelection(prev => new Set(prev).add(cellKey(dateKey, slot)));
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const size = selection.size;
    if (size === 0) return;
    if (size === 1) {
      const [key] = Array.from(selection);
      const { dateKey, slot } = parseCellKey(key);
      const date = dates.find(d => toDateKey(d) === dateKey);
      setSinglePanel({ dateKey, slot, dateLabel: date ? `${toDayName(date)} ${date.getMonth()+1}/${date.getDate()}` : dateKey });
      setSelection(new Set());
    } else {
      setMultiPanel(true);
    }
  };

  const applyToSelection = (activity: string) => {
    batchSetActivity(Array.from(selection).map(parseCellKey), activity);
    setSelection(new Set()); setMultiPanel(false);
  };

  const closeSinglePanel = () => { setSinglePanel(null); setSelection(new Set()); };
  const panelActivity = singlePanel ? getActivity(singlePanel.dateKey, singlePanel.slot) : '';

  const getSelectionSummary = () => {
    if (selection.size <= 1) return '';
    const cells = Array.from(selection).map(parseCellKey);
    const dateKeys = [...new Set(cells.map(c => c.dateKey))];
    const slots = cells.map(c => c.slot).sort((a,b) => slotToHour(a)-slotToHour(b));
    if (dateKeys.length === 1) {
      const date = dates.find(d => toDateKey(d) === dateKeys[0]);
      const label = date ? `${toDayName(date)} ${date.getMonth()+1}/${date.getDate()}` : dateKeys[0];
      return `${label} ${slots[0]}-${String(slotToHour(slots[slots.length-1])+1).padStart(2,'0')}:00`;
    }
    return `${dateKeys.length}天 · ${selection.size}个时段`;
  };

  return (
    <div style={{ padding: '6px 10px', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
      onPointerUp={handlePointerUp} onPointerLeave={() => { if (isDragging.current) { isDragging.current = false; if (selection.size >= 2) setMultiPanel(true); } }}>
      {/* ====== 卡片容器 ====== */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {/* 表头 */}
        <div style={{
          display: 'flex', position: 'relative',
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 44, flexShrink: 0, padding: '6px 2px',
            fontSize: 10, color: 'var(--text-tertiary)',
            textAlign: 'center', fontWeight: 600,
          }}>时间</div>
          {dates.map(date => {
            const dk = toDateKey(date);
            const isToday = dk === todayKey;
            const mood = group.moods?.[member]?.[dk] || '';
            return (
              <div key={dk} style={{
                flex: 1, minWidth: 44, padding: '5px 2px', textAlign: 'center',
                position: 'relative',
              }}>
                {isToday && (
                  <div style={{
                    position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#6366f1',
                  }} />
                )}
                <div style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 600,
                  color: isToday ? 'var(--primary)' : 'var(--text-primary)',
                  marginBottom: 1,
                }}>{toDayName(date)}</div>
                <div style={{
                  fontSize: 10, fontWeight: 500,
                  color: isToday ? 'var(--primary-light)' : 'var(--text-tertiary)',
                }}>{date.getMonth()+1}/{date.getDate()}</div>
                <div style={{ fontSize: 13, marginTop: 1, minHeight: 18 }}>{mood || ''}</div>
              </div>
            );
          })}
        </div>

        {/* 表格主体 */}
        <div style={{ overflowX: 'auto', padding: '2px 0' }}>
          {TIME_SLOTS.map(slot => (
            <div key={slot} style={{
              display: 'flex', alignItems: 'center',
              borderBottom: '1px solid var(--border-subtle)',
              minHeight: CELL_SIZE,
            }}>
              {/* 时间标签 */}
              <div style={{
                width: 44, flexShrink: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'var(--text-tertiary)',
                fontWeight: 500, fontFamily: 'var(--font-display)',
              }}>
                {slot}
              </div>

              {/* 日期格子 */}
              {dates.map(date => {
                const dk = toDateKey(date);
                const act = getActivity(dk, slot);
                const sel = isSelected(dk, slot);
                const isToday = dk === todayKey;
                const actDef = act ? PRESET_ACTIVITIES.find(a => a.key === act) : null;

                return (
                  <div
                    key={dk}
                    onPointerDown={e => handlePointerDown(dk, slot, e)}
                    onPointerEnter={e => handlePointerEnter(dk, slot, e)}
                    onPointerUp={handlePointerUp}
                    style={{
                      flex: 1, minWidth: 44, height: CELL_SIZE,
                      margin: CELL_GAP,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      // 选中状态
                      ...(sel ? {
                        background: '#c7d2fe',
                        border: '2px solid #6366f1',
                        transform: 'scale(1.06)',
                        zIndex: 2, position: 'relative' as const,
                        boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
                      } : {}),
                      // 已标记活动（预设或自定义）
                      ...(!sel && act ? (actDef ? {
                        background: actDef.color,
                        border: `1px solid ${actDef.color}80`,
                      } : (() => { const cc = getCustomColor(act); return {
                        background: cc.bg,
                        border: `1px solid ${cc.border}`,
                      }; })()) : {}),
                      // 今天 + 空闲
                      ...(!sel && !act && isToday ? {
                        background: 'var(--primary-ghost)',
                        border: '2px dashed #c7d2fe',
                      } : {}),
                      // 普通空闲
                      ...(!sel && !act && !isToday ? {
                        background: 'var(--bg-subtle)',
                        border: '1px solid transparent',
                      } : {}),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, transition: 'all 0.12s var(--ease-out-expo)',
                    }}>
                    {/* 选中时显示 ✓，已标记显示 emoji 或自定义文字 */}
                    {sel ? (
                      <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 800 }}>✓</span>
                    ) : act ? (
                      actDef?.emoji ? (
                        <span style={{ fontSize: 14 }}>{actDef.emoji}</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>{act.slice(0, 2)}</span>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 保存状态 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 4px', fontSize: 11, color: 'var(--text-tertiary)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: saving ? '#f59e0b' : '#10b981',
            display: 'inline-block',
            animation: saving ? 'pulse 1s infinite' : 'none',
          }} />
          {saving ? '保存中...' : '已自动保存'}
        </span>
        <span>💡 按住滑动多选</span>
      </div>

      {/* ====== 多选面板 ====== */}
      {multiPanel && selection.size > 0 && <>
        <div onClick={() => { setMultiPanel(false); setSelection(new Set()); }} style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          zIndex: 200, backdropFilter: 'blur(3px)',
        }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          zIndex: 201, padding: '24px 20px 32px',
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideUp 0.3s var(--ease-out-expo)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              已选：{getSelectionSummary()}
            </span>
            <button onClick={() => { setMultiPanel(false); setSelection(new Set()); }}
              className="btn-press"
              style={{
                background: 'var(--bg-subtle)', border: 'none',
                borderRadius: 'var(--radius-sm)', padding: '8px 16px',
                fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)',
                fontWeight: 600,
              }}>取消</button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 10 }}>
            设为：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PRESET_ACTIVITIES.map(act => (
              <button key={act.key} onClick={() => applyToSelection(act.key)}
                className="btn-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)', fontSize: 14,
                  fontWeight: 500, cursor: 'pointer',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 18 }}>{act.emoji}</span>{act.label}
              </button>
            ))}
          </div>

          {/* 自定义标签 */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 14,
            padding: 10, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)',
          }}>
            <input
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="✏️ 自定义，比如：睡觉、演唱会..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border-default)', fontSize: 14,
                outline: 'none', background: 'var(--bg-elevated)',
                fontFamily: 'var(--font-body)',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && customLabel.trim()) {
                  applyToSelection(customLabel.trim());
                  setCustomLabel('');
                }
              }}
            />
            <button
              onClick={() => {
                if (!customLabel.trim()) return;
                applyToSelection(customLabel.trim());
                setCustomLabel('');
              }}
              disabled={!customLabel.trim()}
              className="btn-press"
              style={{
                padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: customLabel.trim() ? 'pointer' : 'not-allowed',
                background: customLabel.trim()
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'var(--border-default)',
                color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                opacity: customLabel.trim() ? 1 : 0.5,
              }}
            >添加</button>
          </div>

          <button onClick={() => applyToSelection('')}
            className="btn-press"
            style={{
              width: '100%', padding: 14, borderRadius: 'var(--radius-sm)',
              border: '1.5px dashed var(--border-strong)',
              background: 'var(--danger-light)',
              color: '#dc2626', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>🗑️ 清除，设为空闲</button>
        </div>
      </>}

      {/* ====== 单格面板 ====== */}
      {singlePanel && <>
        <div onClick={closeSinglePanel} style={{
          position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
          zIndex: 200, backdropFilter: 'blur(3px)',
        }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          zIndex: 201, padding: '24px 18px 32px',
          animation: 'slideUp 0.3s var(--ease-out-expo)',
          maxHeight: '65vh', overflowY: 'auto',
          boxShadow: 'var(--shadow-xl)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{singlePanel.dateLabel}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                ⏰ {singlePanel.slot} ~ {(() => { const h = parseInt(singlePanel.slot)+1; return `${String(h).padStart(2,'0')}:00`; })()} · {member}
              </div>
            </div>
            <button onClick={closeSinglePanel}
              className="btn-press"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--bg-subtle)', border: 'none',
                fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
          </div>

          {panelActivity && (
            <div style={{
              background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', marginBottom: 16, display: 'flex',
              alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>当前：</span>
              <span style={{
                fontSize: 14, fontWeight: 600, padding: '4px 12px',
                borderRadius: 'var(--radius-xs)',
                background: PRESET_ACTIVITIES.some(a => a.key === panelActivity)
                  ? getActivityColor(panelActivity)
                  : (() => { const cc = getCustomColor(panelActivity); return cc.bg; })(),
              }}>{PRESET_ACTIVITIES.some(a => a.key === panelActivity) ? getActivityEmoji(panelActivity) : '📝'} {panelActivity}</span>
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            选择活动：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PRESET_ACTIVITIES.map(act => {
              const isSel = panelActivity === act.key;
              return (
                <button key={act.key}
                  onClick={() => { batchSetActivity([{ dateKey: singlePanel.dateKey, slot: singlePanel.slot }], isSel ? '' : act.key); closeSinglePanel(); }}
                  className="btn-press"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: isSel ? '2px solid #6366f1' : '1px solid var(--border-default)',
                    background: isSel ? 'var(--primary-ghost)' : 'var(--bg-elevated)',
                    fontSize: 14, fontWeight: isSel ? 700 : 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: isSel ? '0 2px 10px rgba(99,102,241,0.15)' : 'var(--shadow-xs)',
                  }}>
                  <span style={{ fontSize: 18 }}>{act.emoji}</span>{act.label}
                </button>
              );
            })}
          </div>

          {/* 自定义标签 */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 14,
            padding: 10, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)',
          }}>
            <input
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="✏️ 自定义，比如：睡觉、演唱会..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border-default)', fontSize: 14,
                outline: 'none', background: 'var(--bg-elevated)',
                fontFamily: 'var(--font-body)',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && customLabel.trim()) {
                  batchSetActivity([{ dateKey: singlePanel.dateKey, slot: singlePanel.slot }], customLabel.trim());
                  setCustomLabel(''); closeSinglePanel();
                }
              }}
            />
            <button
              onClick={() => {
                if (!customLabel.trim()) return;
                batchSetActivity([{ dateKey: singlePanel.dateKey, slot: singlePanel.slot }], customLabel.trim());
                setCustomLabel(''); closeSinglePanel();
              }}
              disabled={!customLabel.trim()}
              className="btn-press"
              style={{
                padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: customLabel.trim() ? 'pointer' : 'not-allowed',
                background: customLabel.trim()
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'var(--border-default)',
                color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                opacity: customLabel.trim() ? 1 : 0.5,
              }}
            >添加</button>
          </div>

          <button onClick={() => { batchSetActivity([{ dateKey: singlePanel.dateKey, slot: singlePanel.slot }], ''); closeSinglePanel(); }}
            className="btn-press"
            style={{
              width: '100%', padding: 14, borderRadius: 'var(--radius-sm)',
              border: '1.5px dashed var(--border-strong)',
              background: panelActivity ? 'var(--danger-light)' : 'var(--success-light)',
              color: panelActivity ? '#dc2626' : '#16a34a', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}>
            {panelActivity ? '🗑️ 清除，设为空闲' : '✅ 当前就是空闲'}
          </button>
        </div>
      </>}
    </div>
  );
}
