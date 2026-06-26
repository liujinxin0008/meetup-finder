import { useState, useCallback } from 'react';
import type { Group, DaySchedule } from '../types';
import { MOOD_OPTIONS, QUICK_PLANS } from '../types';
import { toDateKey, toDateLabel } from '../utils/time';
import { updateMood, updateSchedule } from '../api';

interface DailyCheckinProps {
  group: Group;
  member: string;
  onClose: () => void;
  onGroupUpdate: (group: Group) => void;
}

// 简易 confetti 粒子
const CONFETTI_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
const CONFETTI_COUNT = 50;

function Confetti() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 1.5 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const rotation = Math.random() * 360;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${left}%`,
            top: '-20px',
            width: size, height: size * 0.6,
            borderRadius: `${size/4}px`,
            background: color,
            animation: `confetti-fall ${duration}s ease-in ${delay}s both`,
            transform: `rotate(${rotation}deg)`,
            opacity: 0.9,
          }} />
        );
      })}
    </div>
  );
}

export default function DailyCheckin({ group, member, onClose, onGroupUpdate }: DailyCheckinProps) {
  const [mood, setMood] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'mood' | 'plan' | 'done'>('mood');
  const [showConfetti, setShowConfetti] = useState(false);

  const today = new Date();
  const dateKey = toDateKey(today);
  const dateLabel = toDateLabel(today);

  const currentMood = group.moods?.[member]?.[dateKey] || '';

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (mood) {
        const g1 = await updateMood(group.id, member, dateKey, mood);
        onGroupUpdate(g1);
      }
      if (selectedPlan) {
        const plan = QUICK_PLANS.find(p => p.label === selectedPlan);
        if (plan) {
          let daySchedule: DaySchedule;
          if (selectedPlan === '其他' && customLabel.trim()) {
            daySchedule = {};
            const label = customLabel.trim();
            for (let h = 8; h < 22; h++) {
              daySchedule[`${String(h).padStart(2, '0')}:00`] = label;
            }
          } else {
            daySchedule = plan.generate();
          }
          const g2 = await updateSchedule(group.id, member, dateKey, daySchedule);
          onGroupUpdate(g2);
        }
      }
      setStep('done');
      setShowConfetti(true);
      setTimeout(() => onClose(), 1500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [mood, selectedPlan, customLabel, group, member, dateKey, onGroupUpdate, onClose]);

  const handleSkip = () => {
    if (step === 'mood') {
      setStep('plan');
    } else {
      onClose();
    }
  };

  return (
    <>
      {showConfetti && <Confetti />}

      {/* 遮罩 */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 15, 15, 0.45)',
        zIndex: 300, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24,
        backdropFilter: 'blur(2px)',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
          padding: '28px 24px', width: '100%', maxWidth: 380,
          maxHeight: '85vh', overflowY: 'auto',
          animation: 'popIn 0.4s var(--ease-spring)',
          boxShadow: 'var(--shadow-xl)',
        }}>
          {step === 'done' ? (
            // ====== 完成状态 ======
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                fontSize: 56, animation: 'bounceIn 0.6s var(--ease-spring)',
                marginBottom: 16,
              }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                签到完成！
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {mood && `心情 ${mood} 已记录`}
                {mood && selectedPlan && ' · '}
                {selectedPlan && '今日事项已同步'}
              </div>
              {/* Checkmark animation */}
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
              {/* ====== 步骤指示器（圆点） ====== */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                <div style={{
                  width: step === 'mood' ? 24 : 8, height: 8, borderRadius: '4px',
                  background: step === 'mood' ? '#6366f1' : '#10b981',
                  transition: 'all 0.3s var(--ease-out-expo)',
                }} />
                <div style={{
                  width: step === 'plan' ? 24 : 8, height: 8, borderRadius: '4px',
                  background: step === 'plan' ? '#6366f1' : 'var(--border-default)',
                  transition: 'all 0.3s var(--ease-out-expo)',
                }} />
              </div>

              {/* ====== 头部 ====== */}
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{dateLabel}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  👋 你好，{member}！
                </div>
              </div>

              {/* ====== 步骤 1: 心情 ====== */}
              {step === 'mood' && (
                <>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                    marginBottom: 16, textAlign: 'center',
                  }}>
                    今天心情怎么样？
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
                            aspectRatio: '1',
                            fontSize: 32,
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2.5px solid #6366f1' : '1.5px solid var(--border-default)',
                            background: isSelected ? 'var(--primary-ghost)' : 'var(--bg-elevated)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s var(--ease-spring)',
                            transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                            boxShadow: isSelected ? '0 4px 16px rgba(99,102,241,0.2)' : 'var(--shadow-xs)',
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  {currentMood && !mood && (
                    <div style={{
                      fontSize: 12, color: 'var(--text-tertiary)',
                      textAlign: 'center', marginBottom: 8,
                      padding: '8px 12px', background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      今日已有心情 {currentMood}，可重新选择
                    </div>
                  )}
                </>
              )}

              {/* ====== 步骤 2: 快捷模板 ====== */}
              {step === 'plan' && (
                <>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                    marginBottom: 4, textAlign: 'center',
                  }}>
                    今天主要做什么？
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-tertiary)',
                    marginBottom: 16, textAlign: 'center',
                  }}>
                    选一个模板，自动填入日历
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {QUICK_PLANS.map((plan) => {
                      const isSelected = selectedPlan === plan.label;
                      return (
                        <button
                          key={plan.label}
                          onClick={() => setSelectedPlan(isSelected ? null : plan.label)}
                          className="btn-press"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px 16px', borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2.5px solid #6366f1' : '1.5px solid var(--border-default)',
                            background: isSelected ? 'var(--primary-ghost)' : 'var(--bg-elevated)',
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.15s var(--ease-out-expo)',
                            boxShadow: isSelected ? '0 4px 16px rgba(99,102,241,0.15)' : 'var(--shadow-xs)',
                          }}
                        >
                          <span style={{ fontSize: 28 }}>{plan.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: 15, fontWeight: 700,
                              color: isSelected ? 'var(--primary-dark)' : 'var(--text-primary)',
                            }}>
                              {plan.label}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                              {plan.description}
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: '#fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 13,
                              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                            }}>✓</div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* "其他" 自定义 */}
                  {selectedPlan === '其他' && (
                    <div style={{ marginBottom: 12, animation: 'fadeIn 0.2s var(--ease-out-expo)' }}>
                      <input
                        value={customLabel}
                        onChange={e => setCustomLabel(e.target.value)}
                        placeholder="比如：搬家、陪父母..."
                        style={{
                          width: '100%', padding: '12px 16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '2px solid #c7d2fe', fontSize: 15,
                          outline: 'none', boxSizing: 'border-box',
                          background: 'var(--primary-ghost)',
                          fontFamily: 'var(--font-body)',
                        }}
                        autoFocus
                      />
                      <div style={{
                        fontSize: 11, color: 'var(--text-tertiary)',
                        marginTop: 6, textAlign: 'center',
                      }}>
                        会全天（08:00-22:00）标为你填的内容
                      </div>
                    </div>
                  )}

                  <div style={{
                    fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
                  }}>
                    之后可以在日历里微调
                  </div>
                </>
              )}

              {/* ====== 底部按钮 ====== */}
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  onClick={handleSkip}
                  className="btn-press"
                  style={{
                    flex: 1, padding: '14px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-default)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)', fontSize: 15,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {step === 'mood' ? '跳过' : '上一步'}
                </button>
                <button
                  onClick={() => {
                    if (step === 'mood') {
                      setStep('plan');
                    } else {
                      handleSave();
                    }
                  }}
                  disabled={saving}
                  className="btn-press"
                  style={{
                    flex: 2, padding: '14px', borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: saving
                      ? 'var(--primary-light)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 8px 24px rgba(99,102,241,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  {saving ? '⏳ 保存中...' : step === 'mood' ? '下一步 →' : '✅ 完成签到'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
