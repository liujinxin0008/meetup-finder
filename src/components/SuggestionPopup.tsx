import { useState, useEffect } from 'react';

export interface Suggestion {
  id: string;
  type: 'invite' | 'callout' | 'nudge';
  text: string;
  peer?: string;
  icon?: string;
  dateKey?: string;
  slot?: string;
  activity?: string;
}

interface Props {
  suggestions: Suggestion[];
  onDismiss: (id: string) => void;
  onInvite?: (s: Suggestion) => void;
  onCreateProposal?: (s: Suggestion) => void;
}

export default function SuggestionPopup({ suggestions, onDismiss, onInvite }: Props) {
  return (
    <>
      {suggestions.map((s, i) => (
        <SuggestionCard key={s.id} suggestion={s} index={i} onDismiss={onDismiss} onInvite={onInvite} />
      ))}
    </>
  );
}

function SuggestionCard({ suggestion: s, index, onDismiss, onInvite }: {
  suggestion: Suggestion;
  index: number;
  onDismiss: (id: string) => void;
  onInvite?: (s: Suggestion) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 400);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(s.id), 300);
  };

  const isInvite = s.type === 'invite';
  const isCallout = s.type === 'callout';
  const isNudge = s.type === 'nudge';

  return (
    <div style={{
      position: 'fixed',
      bottom: isInvite ? 180 : (isNudge ? 240 : 160),
      right: isInvite ? 80 : (isCallout ? 16 : 16),
      zIndex: 400,
      maxWidth: 280,
      transform: visible && !exiting
        ? 'translateY(0) scale(1)'
        : 'translateY(20px) scale(0.9)',
      opacity: visible && !exiting ? 1 : 0,
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      pointerEvents: visible && !exiting ? 'auto' : 'none',
    }}>
      {isInvite ? (
        // 邀约卡片
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '2px solid #f59e0b',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 18px',
          boxShadow: '0 8px 32px rgba(245,158,11,0.2)',
          animation: 'float 3s ease-in-out infinite',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon || '📩'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
            发现好机会！
          </div>
          <div style={{ fontSize: 12, color: '#a16207', marginBottom: 10, lineHeight: 1.5 }}>
            {s.text}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {onInvite && (
              <button onClick={() => onInvite(s)} className="btn-press"
                style={{
                  flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                }}
              >📩 邀约</button>
            )}
            <button onClick={handleDismiss} className="btn-press"
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid #d97706', cursor: 'pointer', fontSize: 12,
                background: 'transparent', color: '#92400e', fontWeight: 600,
              }}
            >稍后</button>
          </div>
        </div>
      ) : isNudge ? (
        // 催更卡片
        <div style={{
          background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
          border: '2px solid #6366f1',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px',
          boxShadow: '0 6px 24px rgba(99,102,241,0.2)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3730a3', marginBottom: 4 }}>
            ⏰ {s.text}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => {
              navigator.clipboard.writeText(
                `📢 大家更新一下日程吧！\n${s.peer || ''}等还没更新～\n👉 ${window.location.href}`
              ).catch(() => {});
              handleDismiss();
            }} className="btn-press"
              style={{
                flex: 1, padding: '6px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: '#6366f1', color: '#fff',
              }}
            >📋 复制催更消息</button>
            <button onClick={handleDismiss} className="btn-press"
              style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 11, background: 'transparent', color: '#6366f1', fontWeight: 600 }}>✕</button>
          </div>
        </div>
      ) : (
        // 趣闻 badge
        <div style={{
          background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
          border: '1.5px solid #ec4899',
          borderRadius: 'var(--radius-lg)', padding: '10px 14px',
          boxShadow: '0 4px 16px rgba(236,72,153,0.15)',
          animation: 'float 2s ease-in-out infinite',
        }}>
          <div style={{ fontSize: 11, color: '#9d174d', lineHeight: 1.4, fontWeight: 500 }}>
            {s.text}
          </div>
          <button onClick={handleDismiss} className="btn-press"
            style={{ marginTop: 6, fontSize: 10, background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >知道了 ✕</button>
        </div>
      )}
    </div>
  );
}
