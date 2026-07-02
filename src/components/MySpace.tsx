import { useState, useMemo } from 'react';
import type { Group } from '../types';
import { askAssistant, updateSchedule } from '../api';
import { getWeekDates, toDateKey, toDayName } from '../utils/time';
import { TIME_SLOTS, PRESET_ACTIVITIES, getActivityEmoji } from '../types';

interface TodoItem { id: string; text: string; done: boolean; dateKey?: string; slot?: string; }

interface Props { group: Group; member: string; monday: Date; onGroupUpdate: (g: Group) => void; todos: TodoItem[]; onTodosChange: (t: TodoItem[]) => void; }

const SCHEDULE_COLORS: Record<string, string> = { '上班': '#6366f1', '开会': '#f59e0b', '出差': '#f43f5e', '带娃': '#8b5cf6', '约会': '#ec4899', '健身': '#10b981', '吃饭': '#ea580c', '学习': '#0891b2', '有事': '#ef4444' };

export default function MySpace({ group, member, monday, onGroupUpdate, todos, onTodosChange }: Props) {
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsgs, setAiMsgs] = useState<{ role: string; text: string }[]>([]);
  const [confirmCard, setConfirmCard] = useState<{ reply: string; plans: { dateKey: string; dateLabel: string; slots: Record<string, string> }[] } | null>(null);
  const [todoInput, setTodoInput] = useState('');
  const [filter, setFilter] = useState<'today' | 'week'>('today');
  const [placingTodo, setPlacingTodo] = useState<string | null>(null);
  const [placingStart, setPlacingStart] = useState<{ dk: string; slot: string } | null>(null);
  const [editCell, setEditCell] = useState<{ dk: string; slot: string; act: string } | null>(null);
  const [editInput, setEditInput] = useState('');
  const [multiSelect, setMultiSelect] = useState<Set<string>>(new Set());

  const dates = getWeekDates(monday);
  const todayKey = toDateKey(new Date());
  const nowHour = new Date().getHours();
  const getAct = (dk: string, s: string) => group.schedules[member]?.[dk]?.[s] || '';
  const getSlotTodos = (dk: string, s: string) => todos.filter(t => t.dateKey === dk && t.slot === s);

  const scheduleItems = useMemo(() => {
    const items: { key: string; dateKey: string; slot: string; label: string; emoji: string; color: string }[] = [];
    const target = filter === 'today' ? dates.filter(d => toDateKey(d) === todayKey) : dates;
    for (const d of target) { const dk = toDateKey(d); const sched = group.schedules[member]?.[dk] || {}; const merged: { slots: string[]; act: string }[] = [];
      for (const [slot, act] of Object.entries(sched).filter(([, v]) => v).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) { const last = merged[merged.length - 1]; if (last && last.act === act && parseInt(slot) === parseInt(last.slots[last.slots.length - 1]) + 1) last.slots.push(slot); else merged.push({ slots: [slot], act }); }
      for (const m of merged) items.push({ key: `${dk}|${m.slots[0]}`, dateKey: dk, slot: m.slots[0], label: m.act, emoji: getActivityEmoji(m.act), color: SCHEDULE_COLORS[m.act] || '#8b5cf6' }); }
    return items;
  }, [group.schedules, member, filter, todayKey]);

  const unplacedTodos = todos.filter(t => !t.done && !t.dateKey);
  const placedTodos = todos.filter(t => !t.done && t.dateKey && (filter === 'week' || t.dateKey === todayKey));
  const doneTodos = todos.filter(t => t.done);

  const handleAsk = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput; setAiInput(''); setAiLoading(true);
    setAiMsgs(prev => [...prev, { role: 'user', text: msg }]);
    try {
      const result = await askAssistant(group.id, `【重要：你是${member}的个人助理，只处理${member}自己的日程。绝对不要提其他人、不要对比、不要说"其他人还没签到"之类的话。只关注${member}自身】 ${msg}`);
      setAiMsgs(prev => [...prev, { role: 'bot', text: result.reply }]);
      if (result.plans?.length) setConfirmCard({ reply: result.reply, plans: result.plans });
    } catch (e: any) { setAiMsgs(prev => [...prev, { role: 'bot', text: '出错了: ' + (e.message || '重试') }]); }
    setAiLoading(false);
  };

  const confirmPlans = () => {
    if (!confirmCard) return;
    const sched = { ...group.schedules }; if (!sched[member]) sched[member] = {};
    for (const p of confirmCard.plans) sched[member][p.dateKey] = { ...(sched[member][p.dateKey] || {}), ...p.slots };
    onGroupUpdate({ ...group, schedules: sched });
    setConfirmCard(null);
    for (const p of confirmCard.plans) updateSchedule(group.id, member, p.dateKey, sched[member][p.dateKey]).catch(() => {});
  };

  const setCellAct = (dk: string, s: string, act: string) => {
    const sched = { ...group.schedules }; if (!sched[member]) sched[member] = {};
    if (!sched[member][dk]) sched[member][dk] = {};
    if (act) sched[member][dk][s] = act; else delete sched[member][dk][s];
    onGroupUpdate({ ...group, schedules: sched });
    updateSchedule(group.id, member, dk, sched[member][dk]).catch(() => {});
    setEditCell(null);
  };

  const addTodo = () => { if (!todoInput.trim()) return; onTodosChange([...todos, { id: Date.now().toString(), text: todoInput, done: false }]); setTodoInput(''); };
  const placeTodo = (id: string, dk: string, s: string) => {
    if (!placingStart) { setPlacingStart({ dk, slot: s }); return; }
    if (placingStart.dk !== dk) { setPlacingStart({ dk, slot: s }); return; }
    const h1 = parseInt(placingStart.slot); const h2 = parseInt(s);
    const [start, end] = h1 <= h2 ? [h1, h2] : [h2, h1];
    const source = todos.find(t => t.id === id);
    let updated = todos.map(t => t.id === id ? { ...t, dateKey: dk, slot: `${String(start).padStart(2, '0')}:00` } : t);
    for (let h = start + 1; h <= end; h++) {
      updated = [...updated, { id: Date.now().toString() + h, text: source?.text || '', done: false, dateKey: dk, slot: `${String(h).padStart(2, '0')}:00` }];
    }
    onTodosChange(updated);
    setPlacingTodo(null); setPlacingStart(null);
  };
  const toggleTodo = (id: string) => { onTodosChange(todos.map(t => t.id === id ? { ...t, done: !t.done } : t)); };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      {/* ====== 待办 30% ====== */}
      <div style={{ width: '30%', minWidth: 150, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📋 待办</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button onClick={() => setFilter('today')} style={{ flex: 1, padding: '4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filter === 'today' ? 700 : 500, background: filter === 'today' ? '#6366f1' : 'var(--bg-subtle)', color: filter === 'today' ? '#fff' : 'var(--text-secondary)' }}>今天</button>
            <button onClick={() => setFilter('week')} style={{ flex: 1, padding: '4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filter === 'week' ? 700 : 500, background: filter === 'week' ? '#6366f1' : 'var(--bg-subtle)', color: filter === 'week' ? '#fff' : 'var(--text-secondary)' }}>本周</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTodo(); }} placeholder="+ 添加待办" style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1.5px solid var(--border-default)', fontSize: 12, outline: 'none', background: 'var(--bg-subtle)' }} />
            <button onClick={addTodo} style={{ padding: '7px 12px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {/* ── 今日日程 ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              📅 {filter === 'today' ? '今日日程' : '本周日程'}
              <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary)' }}>只读</span>
            </div>
            {scheduleItems.length > 0 ? scheduleItems.map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', marginBottom: 2, borderRadius: 6, fontSize: 12, background: item.color + '10', border: `1px solid ${item.color}20` }}>
                <span style={{ fontSize: 16 }}>{item.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.slot}</div>
                </div>
                <div style={{ width: 3, height: 20, borderRadius: 2, background: item.color }} />
              </div>
            )) : <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '8px 0' }}>暂无日程</div>}
          </div>

          {/* ── 任务 ── */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              ✅ 任务
              <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-tertiary)' }}>{todos.filter(t => !t.done).length}项</span>
            </div>

            {/* 未安排的任务 */}
            {unplacedTodos.map(t => (
              <div key={t.id} onClick={() => setPlacingTodo(placingTodo === t.id ? null : t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', marginBottom: 2, borderRadius: 5, fontSize: 12, cursor: 'pointer', background: placingTodo === t.id ? '#fef3c7' : 'transparent' }}>
                <button onClick={(e) => { e.stopPropagation(); toggleTodo(t.id); }} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${t.done ? '#10b981' : 'var(--border-default)'}`, background: t.done ? '#10b981' : '#fff', color: '#fff', cursor: 'pointer', flexShrink: 0, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{t.done ? '✓' : ''}</button>
                <span style={{ flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{t.text}</span>
                {placingTodo === t.id && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 600 }}>{placingStart ? '选结束' : '放日程→'}</span>}
              </div>
            ))}

            {/* 已安排的任务 */}
            {placedTodos.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 3 }}>📌 已排</div>
                {placedTodos.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', marginBottom: 1, borderRadius: 4, fontSize: 11 }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleTodo(t.id); }} style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid var(--border-default)', background: '#fff', cursor: 'pointer', flexShrink: 0, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} />
                    <span style={{ flex: 1 }}>{t.text}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{t.slot}</span>
                    <button onClick={(e) => { e.stopPropagation(); onTodosChange(todos.map(x => x.id === t.id ? { ...x, dateKey: undefined, slot: undefined } : x)); }} style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* 已完成 */}
            {doneTodos.length > 0 && (
              <div style={{ marginTop: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 3 }}>完成 {doneTodos.length}</div>
                {doneTodos.slice(0, 6).map(t => (
                  <div key={t.id} onClick={() => toggleTodo(t.id)} style={{ fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'line-through', padding: '2px 4px', cursor: 'pointer' }}>{t.text}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== 日程 50% ====== */}
      <div style={{ width: '50%', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
        <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)', background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          现在 {String(nowHour).padStart(2, '0')}:00
          {placingTodo && (
            <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 11 }}>
              {placingStart ? '→ 再点结束格子' : '→ 点第一个格子开始'}
            </span>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 420 }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', paddingBottom: 3 }}>
                <div style={{ width: 40, flexShrink: 0 }} />
                {dates.map(d => { const dk = toDateKey(d); const isToday = dk === todayKey;
                  return <div key={dk} style={{ flex: 1, minWidth: 52, textAlign: 'center', padding: '4px 0' }}><div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? '#6366f1' : 'var(--text-primary)' }}>{toDayName(d)}</div><div style={{ fontSize: 10, color: isToday ? '#6366f1' : 'var(--text-tertiary)' }}>{d.getMonth() + 1}/{d.getDate()}</div></div>;
                })}
              </div>
              {TIME_SLOTS.map(slot => { const h = parseInt(slot); const isNow = h === nowHour; return (
                <div key={slot} style={{ display: 'flex', alignItems: 'flex-start', background: isNow ? '#fef2f2' : 'transparent', borderBottom: '1px solid var(--border-subtle)', minHeight: 34 }}>
                  <div style={{ width: 40, flexShrink: 0, fontSize: 10, color: isNow ? '#ef4444' : 'var(--text-tertiary)', textAlign: 'center', fontWeight: isNow ? 700 : 400, paddingTop: 8 }}>{slot}{isNow && ' ◀'}</div>
                  {dates.map(d => { const dk = toDateKey(d); const act = getAct(dk, slot); const stodos = getSlotTodos(dk, slot); const actDef = act ? PRESET_ACTIVITIES.find(a => a.key === act) : null;
                    return <div key={dk} onClick={() => {
                      if (placingTodo) { placeTodo(placingTodo, dk, slot); return; }
                      setEditCell({ dk, slot, act });
                    }}
                      style={{ flex: 1, minWidth: 52, minHeight: 34, margin: 1, borderRadius: 5, display: 'flex', flexDirection: 'column', gap: 1, padding: 2,
                        background: act ? (actDef?.color || '#e9d5ff') : (toDateKey(d) === todayKey ? '#f8fafc' : 'transparent'),
                        border: act ? `1px solid ${actDef?.color || '#d8b4fe'}30` : (toDateKey(d) === todayKey ? '1px dashed #e2e8f0' : '1px solid transparent'),
                        cursor: placingTodo ? 'pointer' : 'default' }}>
                      {act && <div style={{ fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{actDef?.emoji || act.slice(0, 2)}</div>}
                      {stodos.map(t => <div key={t.id} onClick={(e) => { e.stopPropagation(); toggleTodo(t.id); }}
                        style={{ fontSize: 8, padding: '1px 3px', borderRadius: 3, background: t.done ? 'transparent' : '#f59e0b30', color: t.done ? '#d4d4d8' : '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text.slice(0, 8)}</div>)}
                    </div>;
                  })}
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>

      {/* ====== AI 助理 20% ====== */}
      <div style={{ width: '20%', minWidth: 160, borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden', paddingBottom: 50 }}>
        <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #eef2ff, #ede9fe)', borderBottom: '1px solid #ddd6fe' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>🤖 个人助理</div>
          <div style={{ fontSize: 10, color: '#7c3aed', opacity: 0.7 }}>帮你安排日程</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {aiMsgs.length === 0 && !aiLoading && (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              跟我说：<br/>"今天上午开会下午写代码"<br/>"周三全天出差"
            </div>
          )}
          {aiMsgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ padding: '8px 12px', borderRadius: m.role === 'user' ? 'var(--radius-md) 4px var(--radius-md) var(--radius-md)' : '4px var(--radius-md) var(--radius-md) var(--radius-md)', background: m.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-subtle)', color: m.role === 'user' ? '#fff' : 'var(--text-primary)', fontSize: 12, lineHeight: 1.5, maxWidth: '100%', whiteSpace: 'pre-line' }}>{m.text}</div>
            </div>
          ))}
          {aiLoading && <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: 4 }}><span>🤖</span>{[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#c7d2fe', animation: `pulse 1s infinite ${i*0.2}s` }}/>)}</div>}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 4 }}>
          <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAsk(); }} placeholder="说安排..." style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border-default)', fontSize: 12, outline: 'none', background: 'var(--bg-subtle)' }} />
          <button onClick={handleAsk} disabled={aiLoading || !aiInput.trim()} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: aiInput.trim() ? '#6366f1' : 'var(--border-default)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: aiInput.trim() ? 'pointer' : 'not-allowed' }}>发送</button>
        </div>
      </div>

      {/* 格子编辑弹窗 */}
      {editCell && (
        <div onClick={() => setEditCell(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '24px', maxWidth: 340, width: '100%', boxShadow: 'var(--shadow-xl)', animation: 'popIn 0.2s' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              {dates.find(d => toDateKey(d) === editCell.dk) ? `${toDayName(dates.find(d => toDateKey(d) === editCell.dk)!)} ` : ''}{editCell.slot}
            </div>
            {editCell.act && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>当前：{editCell.act}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {PRESET_ACTIVITIES.map(a => (
                <button key={a.key} onClick={() => setCellAct(editCell.dk, editCell.slot, a.key === editCell.act ? '' : a.key)} className="btn-press"
                  style={{ padding: '6px 12px', borderRadius: 8, border: editCell.act === a.key ? '2px solid #6366f1' : '1px solid var(--border-default)', background: editCell.act === a.key ? '#eef2ff' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>{a.emoji} {a.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={editInput} onChange={e => setEditInput(e.target.value)} placeholder="自定义..." style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border-default)', fontSize: 12, outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter' && editInput.trim()) { setCellAct(editCell.dk, editCell.slot, editInput.trim()); setEditInput(''); } }} />
              <button onClick={() => { if (editInput.trim()) { setCellAct(editCell.dk, editCell.slot, editInput.trim()); setEditInput(''); } }}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>确定</button>
            </div>
            <button onClick={() => setCellAct(editCell.dk, editCell.slot, '')} style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed var(--border-default)', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑️ 清除为空闲</button>
          </div>
        </div>
      )}

      {/* AI 确认卡片 */}
      {confirmCard && (
        <div onClick={() => setConfirmCard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '24px 28px', maxWidth: 420, width: '100%', maxHeight: '70vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', animation: 'popIn 0.3s' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16, whiteSpace: 'pre-line' }}>{confirmCard.reply}</div>
            {confirmCard.plans.map((p, i) => (
              <div key={i} style={{ padding: '8px 12px', marginBottom: 4, background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', fontSize: 13 }}>
                <b style={{ color: '#166534' }}>{p.dateLabel}</b>
                <span style={{ marginLeft: 8, color: '#64748b' }}>{Object.entries(p.slots).length > 0 ? `${Object.keys(p.slots)[0]}~${String(parseInt(Object.keys(p.slots)[Object.keys(p.slots).length-1])+1).padStart(2,'0')}:00` : '空闲'} {[...new Set(Object.values(p.slots))].filter(Boolean).join('、')}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setConfirmCard(null)} style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>取消</button>
              <button onClick={confirmPlans} style={{ flex: 2, padding: '12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'linear-gradient(135deg, #10b981, #34d399)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>✅ 确认填入日历</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
