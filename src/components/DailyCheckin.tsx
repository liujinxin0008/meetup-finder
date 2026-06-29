import { useState } from 'react';
import type { Group } from '../types';
import { MOOD_OPTIONS } from '../types';
import { toDateKey, toDateLabel } from '../utils/time';
import { updateMood } from '../api';

interface DailyCheckinProps {
  group: Group;
  member: string;
  onClose: () => void;
  onGroupUpdate: (group: Group) => void;
}

const CONFETTI_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

function Confetti() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 1.5 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        return (
          <div key={i} style={{
            position: 'absolute', left: `${left}%`, top: '-20px',
            width: size, height: size * 0.6, borderRadius: `${size / 4}px`,
            background: color, animation: `confetti-fall ${duration}s ease-in ${delay}s both`,
            transform: `rotate(${Math.random() * 360}deg)`, opacity: 0.9,
          }} />
        );
      })}
    </div>
  );
}

export default function DailyCheckin({ group, member, onClose, onGroupUpdate }: DailyCheckinProps) {
  const [mood, setMood] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const today = new Date();
  const dateKey = toDateKey(today);
  const dateLabel = toDateLabel(today);
  const currentMood = group.moods?.[member]?.[dateKey] || '';

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mood) {
        const g1 = await updateMood(group.id, member, dateKey, mood);
        onGroupUpdate(g1);
      }
      setDone(true);
      setShowConfetti(true);
      setTimeout(() => onClose(), 1500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 15, 15, 0.45)',
        zIndex: 300, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24, backdropFilter: 'blur(2px)',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
          padding: '28px 24px', width: '100%', maxWidth: 380,
          maxHeight: '85vh', overflowY: 'auto',
          animation: 'popIn 0.4s var(--ease-spring)',
          boxShadow: 'var(--shadow-xl)',
        }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 56, animation: 'bounceIn 0.6s var(--ease-spring)', marginBottom: 16 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                签到完成！
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {mood ? `心情 ${mood} 已记录` : '已签到'}
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '20px auto 0', boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                animation: 'bounceIn 0.5s var(--ease-spring) 0.2s both',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{dateLabel}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  👋 你好，{member}！
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>
                  今天心情怎么样？
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
                marginBottom: 20,
              }}>
                {MOOD_OPTIONS.map((m) => {
                  const isSelected = mood === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMood(isSelected ? '' : m)}
                      className="btn-press"
                      style={{
                        aspectRatio: '1', fontSize: 32,
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2.5px solid #6366f1' : '1.5px solid var(--border-default)',
                        background: isSelected ? 'var(--primary-ghost)' : 'var(--bg-elevated)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s var(--ease-spring)',
                        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                        boxShadow: isSelected ? '0 4px 16px rgba(99,102,241,0.2)' : 'var(--shadow-xs)',
                      }}
                    >{m}</button>
                  );
                })}
              </div>

              {currentMood && !mood && (
                <div style={{
                  fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
                  marginBottom: 12, padding: '8px 12px', background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  今日已有心情 {currentMood}，可重新选择
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                💡 签到后可以用下方的 <b>智能助手</b> 填写日程
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onClose}
                  className="btn-press"
                  style={{
                    flex: 1, padding: '14px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-default)',
                    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >稍后再说</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-press"
                  style={{
                    flex: 2, padding: '14px', borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: saving ? 'var(--primary-light)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 8px 24px rgba(99,102,241,0.35)',
                  }}
                >{saving ? '⏳' : '✅ 签到'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
