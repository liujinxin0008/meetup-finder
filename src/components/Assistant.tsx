import { useState, useRef, useEffect } from 'react';
import type { Group, DaySchedule } from '../types';
import type { ParsedPlan } from '../utils/parser';
import { parseSchedule, scanFreeSlots, generateGreeting } from '../utils/parser';
import { getMonday, getWeekDates, toDateKey } from '../utils/time';
import { updateSchedule } from '../api';

interface AssistantProps {
  group: Group;
  member: string;
  onGroupUpdate: (group: Group) => void;
}

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
  plans?: ParsedPlan[];
  suggestions?: { dateKey: string; dateLabel: string; slot: string; timeLabel: string; freePeers: string[]; busyPeers: string[]; missingPeers: string[] }[];
  callouts?: string[];
}

export default function Assistant({ group, member, onGroupUpdate }: AssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const monday = getMonday(new Date());

  // 初始化打招呼
  useEffect(() => {
    if (member && messages.length === 0) {
      const greeting = generateGreeting(group, member);
      setMessages([{ role: 'bot', text: greeting }]);
      setTimeout(() => setCollapsed(false), 500);
    }
  }, [member]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // 解析
    const { plans, reminders, unrecognized } = parseSchedule(text, monday);

    // 扫描空闲
    const { suggestions, callouts } = scanFreeSlots(group, member, monday);

    // 构建回复
    let reply = '';
    if (plans.length > 0) {
      const dayList = plans.map(p => `📅 ${p.dateLabel}`).join('\n');
      const totalSlots = plans.reduce((sum, p) => sum + Object.keys(p.slots).length, 0);
      reply = `解析到 ${plans.length} 天 ${totalSlots} 个时段：\n${dayList}\n\n确认无误？`;
    }
    if (reminders.length > 0) {
      reply += '\n' + reminders.join('\n');
    }
    if (unrecognized.length > 0) {
      reply += `\n\n🤔 没太理解"${unrecognized[0]}"，可以换个说法试试？`;
    }
    if (!plans.length && !reminders.length && !unrecognized.length) {
      reply = '没有解析到日程信息，试试说"周一到周五白天上班，周六爬山"？';
    }

    const botMsg: ChatMessage = { role: 'bot', text: reply, plans: plans.length > 0 ? plans : undefined, suggestions, callouts };
    setMessages(prev => [...prev, botMsg]);
  };

  const handleConfirmPlans = async () => {
    const lastBot = [...messages].reverse().find(m => m.role === 'bot' && m.plans);
    if (!lastBot?.plans) return;

    const newSchedules = { ...group.schedules };
    if (!newSchedules[member]) newSchedules[member] = {};

    for (const plan of lastBot.plans) {
      newSchedules[member][plan.dateKey] = {
        ...(newSchedules[member][plan.dateKey] || {}),
        ...plan.slots,
      };
    }

    onGroupUpdate({ ...group, schedules: newSchedules });

    // 保存到服务器
    try {
      for (const plan of lastBot.plans) {
        const daySchedule = newSchedules[member][plan.dateKey];
        const result = await updateSchedule(group.id, member, plan.dateKey, daySchedule);
        onGroupUpdate(result);
      }
    } catch {}

    setMessages(prev => [...prev, { role: 'bot', text: '✅ 已保存！我帮你看了其他人的状态：' }]);

    // 扫描建议
    const { suggestions, callouts } = scanFreeSlots(group, member, monday);
    const sugMsg: ChatMessage = { role: 'bot', text: '', suggestions, callouts };
    if (suggestions.length > 0 || callouts.length > 0) {
      setMessages(prev => [...prev, sugMsg]);
    }
  };

  // 语音输入
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ 你的浏览器不支持语音输入。请在 Chrome 或 Safari 中打开，或手动输入。' }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
      setMessages(prev => [...prev, { role: 'bot', text: '🎤 没听清楚，再试一次？' }]);
    };

    recognition.onend = () => setListening(false);
  };

  return (
    <div style={{ padding: '8px 12px' }}>
      {/* 折叠按钮 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="btn-press"
        style={{
          width: '100%', padding: '10px 16px',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 600, color: '#4f46e5',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <span>🤖</span> 智能助手
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {collapsed ? '展开 ▲' : '收起 ▼'}
        </span>
      </button>

      {!collapsed && (
        <div style={{
          marginTop: 8, background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-subtle)',
        }}>
          {/* 消息区 */}
          <div ref={scrollRef} style={{
            maxHeight: 320, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
              }}>
                {/* 消息气泡 */}
                {msg.text && (
                  <div style={{
                    padding: '10px 14px', borderRadius: msg.role === 'user'
                      ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
                      : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'var(--bg-subtle)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line',
                  }}>
                    {msg.text}
                  </div>
                )}

                {/* 解析结果卡片 */}
                {msg.plans && msg.plans.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {msg.plans.map((plan, j) => (
                      <div key={j} style={{
                        padding: '8px 12px', marginBottom: 4,
                        background: '#f0fdf4', borderRadius: 'var(--radius-sm)',
                        border: '1px solid #bbf7d0', fontSize: 12,
                      }}>
                        <span style={{ fontWeight: 700, color: '#166534' }}>{plan.dateLabel}</span>
                        <span style={{ marginLeft: 8, color: '#64748b' }}>
                          {Object.entries(plan.slots).slice(0, 3).map(([s, a]) => `${s} ${a || '空闲'}`).join(' | ')}
                          {Object.keys(plan.slots).length > 3 ? ` +${Object.keys(plan.slots).length - 3}` : ''}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={handleConfirmPlans}
                      className="btn-press"
                      style={{
                        padding: '8px 16px', marginTop: 4,
                        borderRadius: 'var(--radius-sm)',
                        border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #10b981, #34d399)',
                        color: '#fff', fontSize: 13, fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(16,185,129,0.2)',
                      }}
                    >✅ 确认并填入日历</button>
                  </div>
                )}

                {/* 空闲建议 */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      💡 你有空闲，其他人：
                    </div>
                    {msg.suggestions.slice(0, 3).map((s, j) => (
                      <div key={j} style={{
                        padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                        background: '#fffbeb', border: '1px solid #fde68a', fontSize: 11,
                      }}>
                        <span style={{ fontWeight: 600 }}>{s.dateLabel} {s.timeLabel}</span>
                        {s.freePeers.length > 0 && (
                          <span style={{ color: '#16a34a', marginLeft: 6 }}>
                            ✅ {s.freePeers.join('、')}也空闲
                          </span>
                        )}
                        {s.missingPeers.length > 0 && (
                          <span style={{ color: '#d97706', marginLeft: 6 }}>
                            ❓ {s.missingPeers.join('、')}还没签到
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 趣闻八卦 */}
                {msg.callouts && msg.callouts.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                    {msg.callouts.map((c, j) => (
                      <div key={j}>{c}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 输入区 */}
          <div style={{
            display: 'flex', gap: 6, padding: '10px 14px',
            borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)',
          }}>
            <button
              onClick={startListening}
              className="btn-press"
              style={{
                width: 40, height: 40, borderRadius: '50%',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                background: listening
                  ? 'linear-gradient(135deg, #ef4444, #f87171)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: listening ? 'pulse 1s infinite' : 'none',
              }}
              title="语音输入"
            >{listening ? '🔴' : '🎤'}</button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(input); }}
              placeholder="说说你的安排，比如：周一到周五上班，周六爬山..."
              style={{
                flex: 1, padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border-default)',
                fontSize: 14, outline: 'none',
                background: 'var(--bg-elevated)',
                fontFamily: 'var(--font-body)',
              }}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="btn-press"
              style={{
                padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                background: input.trim()
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'var(--border-default)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                opacity: input.trim() ? 1 : 0.5,
              }}
            >发送</button>
          </div>
        </div>
      )}
    </div>
  );
}
