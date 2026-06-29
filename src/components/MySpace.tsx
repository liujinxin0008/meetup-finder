import { useState } from 'react';
import type { Group } from '../types';
import { askAssistant, updateSchedule } from '../api';
import { getWeekDates, toDateKey, toDayName } from '../utils/time';
import { TIME_SLOTS, PRESET_ACTIVITIES, getActivityEmoji } from '../types';

interface Props {
  group: Group;
  member: string;
  monday: Date;
  onGroupUpdate: (group: Group) => void;
  onSuggestion?: (s: { id: string; type: 'invite' | 'callout'; text: string; peer?: string; dateKey?: string; slot?: string; activity?: string }) => void;
}

interface TodoItem { id: string; text: string; done: boolean; }

export default function MySpace({ group, member, monday, onGroupUpdate, onSuggestion }: Props) {
  const [aiInput, setAiInput] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlans, setAiPlans] = useState<{ dateKey: string; dateLabel: string; slots: Record<string, string> }[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: '更新本周日程', done: false },
  ]);
  const [todoInput, setTodoInput] = useState('');

  const dates = getWeekDates(monday);
  const todayKey = toDateKey(new Date());
  const nowHour = new Date().getHours();

  const getActivity = (dateKey: string, slot: string): string =>
    group.schedules[member]?.[dateKey]?.[slot] || '';

  // 发消息给 AI
  const handleAsk = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput;
    setAiInput('');
    setAiLoading(true);
    try {
      const result = await askAssistant(group.id, msg);
      setAiReply(result.reply);
      if (result.plans?.length) setAiPlans(result.plans);
      if (result.suggestions?.length && onSuggestion) {
        result.suggestions.forEach((s, i) => {
          onSuggestion({ id: `mys-${Date.now()}-${i}`, type: 'invite', text: s.text, peer: s.peer, dateKey: s.dateKey, slot: s.slot, activity: '吃饭' });
        });
      }
    } catch (e: any) { setAiReply('😅 ' + (e.message || '出错了')); }
    setAiLoading(false);
  };

  // 确认 AI 计划
  const handleConfirmPlans = async () => {
    const newSchedules = { ...group.schedules };
    if (!newSchedules[member]) newSchedules[member] = {};
    for (const p of aiPlans) {
      newSchedules[member][p.dateKey] = { ...(newSchedules[member][p.dateKey] || {}), ...p.slots };
    }
    onGroupUpdate({ ...group, schedules: newSchedules });
    try { for (const p of aiPlans) await updateSchedule(group.id, member, p.dateKey, newSchedules[member][p.dateKey]); } catch {}
    setAiPlans([]);
    setAiReply('');
  };

  // Todo
  const addTodo = () => {
    if (!todoInput.trim()) return;
    setTodos(prev => [...prev, { id: Date.now().toString(), text: todoInput, done: false }]);
    setTodoInput('');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
      {/* ====== 左侧面板：AI + Todo ====== */}
      <div style={{ width: 240, minWidth: 240, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
        {/* AI 对话区 */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🤖</span> AI 助手
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAsk(); }}
              placeholder="说说安排..."
              style={{ flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 12, outline: 'none', background: 'var(--bg-subtle)' }}
            />
            <button onClick={handleAsk} disabled={aiLoading} className="btn-press"
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >发送</button>
          </div>
          {aiLoading && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>🤔 思考中...</div>}
          {aiReply && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', fontSize: 12, lineHeight: 1.5, color: 'var(--text-primary)', maxHeight: 120, overflowY: 'auto' }}>
              {aiReply}
              {aiPlans.length > 0 && (
                <button onClick={handleConfirmPlans} className="btn-press"
                  style={{ marginTop: 6, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}
                >✅ 确认填入日历</button>
              )}
            </div>
          )}
        </div>

        {/* Todo 区 */}
        <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋</span> 待办
          </div>
          {todos.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12 }}>
              <button onClick={() => setTodos(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--border-default)', background: t.done ? '#10b981' : 'transparent', color: t.done ? '#fff' : 'transparent', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >✓</button>
              <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{t.text}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <input
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTodo(); }}
              placeholder="+ 添加"
              style={{ flex: 1, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 11, outline: 'none', background: 'var(--bg-subtle)' }}
            />
            <button onClick={addTodo} className="btn-press"
              style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
            >+</button>
          </div>
        </div>
      </div>

      {/* ====== 右侧面板：时间轨道 ====== */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {/* 现在是几点 */}
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          现在 {String(nowHour).padStart(2, '0')}:00
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 520 }}>
            {/* 表头 */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ width: 44, flexShrink: 0 }} />
              {dates.map(d => {
                const dk = toDateKey(d); const isToday = dk === todayKey;
                return (
                  <div key={dk} style={{ flex: 1, minWidth: 64, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? '#6366f1' : 'var(--text-primary)' }}>{toDayName(d)}</div>
                    <div style={{ fontSize: 10, color: isToday ? '#6366f1' : 'var(--text-tertiary)' }}>{d.getMonth() + 1}/{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* 时间行 */}
            {TIME_SLOTS.map(slot => {
              const h = parseInt(slot);
              const isNow = h === nowHour;
              return (
                <div key={slot} style={{
                  display: 'flex', alignItems: 'center',
                  background: isNow ? '#fef2f2' : 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                  minHeight: 28,
                }}>
                  <div style={{ width: 44, flexShrink: 0, fontSize: 10, color: isNow ? '#ef4444' : 'var(--text-tertiary)', textAlign: 'center', fontWeight: isNow ? 700 : 400 }}>
                    {slot}
                    {isNow && <span style={{ marginLeft: 2, fontSize: 8 }}>◀</span>}
                  </div>
                  {dates.map(d => {
                    const dk = toDateKey(d);
                    const act = getActivity(dk, slot);
                    const isToday = dk === todayKey;
                    const actDef = act ? PRESET_ACTIVITIES.find(a => a.key === act) : null;
                    return (
                      <div key={dk} style={{
                        flex: 1, minWidth: 64, height: 28, margin: '1px',
                        borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: act ? (actDef?.color || '#e9d5ff') : (isToday ? '#f8fafc' : 'transparent'),
                        border: act ? `1px solid ${actDef?.color || '#d8b4fe'}60` : (isToday ? '1px dashed #e2e8f0' : '1px solid transparent'),
                        fontSize: 12,
                      }}>
                        {act ? (actDef?.emoji || act.slice(0, 2)) : ''}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
