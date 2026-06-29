import { useState, useRef, useEffect } from 'react';
import type { Group } from '../types';
import { askAssistant } from '../api';
import { updateSchedule } from '../api';
import { getMonday, getWeekDates } from '../utils/time';

interface Props {
  group: Group;
  member: string;
  onGroupUpdate: (group: Group) => void;
}

interface ChatMsg {
  role: 'bot' | 'user';
  text: string;
  plans?: { dateKey: string; dateLabel: string; slots: Record<string, string> }[];
  suggestions?: { text: string; action: string; dateKey?: string; slot?: string; peer?: string }[];
  callouts?: string[];
}

export default function Assistant({ group, member, onGroupUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && messages.length === 0 && member) {
      setMessages([{ role: 'bot', text: `👋 你好 ${member}！我是聚会助手。告诉我你这周有什么安排，我会帮你填好日历，顺便帮你看看其他人的时间。` }]);
    }
  }, [open, member]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const result = await askAssistant(group.id, text);
      const botMsg: ChatMsg = {
        role: 'bot',
        text: result.reply,
        plans: result.plans?.length ? result.plans : undefined,
        suggestions: result.suggestions?.length ? result.suggestions : undefined,
        callouts: result.callouts?.length ? result.callouts : undefined,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'bot', text: `😅 ${err.message || '出错了，稍后重试'}` }]);
    }
    setLoading(false);
  };

  const handleConfirm = async (plans: { dateKey: string; dateLabel: string; slots: Record<string, string> }[]) => {
    const newSchedules = { ...group.schedules };
    if (!newSchedules[member]) newSchedules[member] = {};

    for (const plan of plans) {
      newSchedules[member][plan.dateKey] = {
        ...(newSchedules[member][plan.dateKey] || {}),
        ...plan.slots,
      };
    }

    onGroupUpdate({ ...group, schedules: newSchedules });

    try {
      for (const plan of plans) {
        const daySchedule = newSchedules[member][plan.dateKey];
        await updateSchedule(group.id, member, plan.dateKey, daySchedule);
      }
    } catch {}

    setMessages(prev => [...prev, { role: 'bot', text: '✅ 已保存到日历！' }]);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ 浏览器不支持语音，请手动输入' }]);
      return;
    }
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    setListening(true);
    rec.start();
    rec.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
  };

  return (
    <>
      {/* 浮动按钮 */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 90, right: 16, zIndex: 500,
          width: 52, height: 52, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          background: open
            ? 'var(--bg-elevated)'
            : 'linear-gradient(135deg, #6366f1, #a855f7)',
          color: open ? '#6366f1' : '#fff',
          fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          transition: 'all 0.2s var(--ease-out-expo)',
        }}
      >
        {open ? '✕' : '💬'}
        {!open && (
          <div style={{
            position: 'absolute', top: -6, right: -6,
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', border: '2px solid white',
            animation: 'pulse 2s infinite',
          }} />
        )}
      </button>

      {/* 浮窗 */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 152, right: 16,
          width: 340, maxWidth: 'calc(100vw - 32px)',
          maxHeight: '60vh', zIndex: 500,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 0.25s var(--ease-out-expo)',
        }}>
          {/* 头部 */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>聚会助手 AI</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>DeepSeek</span>
          </div>

          {/* 消息区 */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
            minHeight: 200,
          }}>
            {messages.map((msg, i) => (
              <div key={i}>
                {/* 气泡 */}
                <div style={{
                  padding: '10px 14px', borderRadius: msg.role === 'user'
                    ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
                    : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-subtle)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line',
                  maxWidth: '100%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {msg.text}
                </div>

                {/* 计划卡片 */}
                {msg.plans && msg.plans.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {msg.plans.map((p, j) => (
                      <div key={j} style={{
                        padding: '6px 10px', marginBottom: 3, fontSize: 11,
                        background: '#f0fdf4', borderRadius: 'var(--radius-sm)',
                        border: '1px solid #bbf7d0',
                      }}>
                        <b style={{ color: '#166534' }}>{p.dateLabel}</b>
                        <span style={{ marginLeft: 8, color: '#64748b' }}>
                          {Object.entries(p.slots).length > 0
                            ? `${Object.keys(p.slots)[0]}~${Object.keys(p.slots)[Object.keys(p.slots).length - 1]}`
                            : '空闲'}
                          {' '}{[...new Set(Object.values(p.slots))].join('、')}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => handleConfirm(msg.plans!)}
                      className="btn-press"
                      style={{
                        marginTop: 4, padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                        border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: 'linear-gradient(135deg, #10b981, #34d399)',
                        color: '#fff', boxShadow: '0 2px 6px rgba(16,185,129,0.2)',
                      }}
                    >✅ 确认填入日历</button>
                  </div>
                )}

                {/* 建议 */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {msg.suggestions.map((s, j) => (
                      <div key={j} style={{
                        padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                        background: '#fff7ed', border: '1px solid #fed7aa',
                        fontSize: 11, color: '#92400e',
                      }}>
                        💡 {s.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* 趣闻 */}
                {msg.callouts && msg.callouts.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                    {msg.callouts.map((c, j) => <div key={j}>{c}</div>)}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: 8 }}>🤔 思考中...</div>
            )}
          </div>

          {/* 输入 */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <button
              onClick={startListening}
              className="btn-press"
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                background: listening ? '#ef4444' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: listening ? 'pulse 1s infinite' : 'none',
              }}
            >🎤</button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(input); }}
              placeholder="说说安排，比如：周一三五上班周二加班..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border-default)', fontSize: 13, outline: 'none',
                background: 'var(--bg-elevated)', fontFamily: 'var(--font-body)',
              }}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
              className="btn-press"
              style={{
                padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--border-default)',
                color: '#fff', fontSize: 13, fontWeight: 700, opacity: input.trim() ? 1 : 0.5,
              }}
            >发送</button>
          </div>
        </div>
      )}
    </>
  );
}
