import { useState, useRef, useEffect } from 'react';
import type { Group } from '../types';
import { SCENE_CATEGORIES } from '../types';
import { matchScene, formatTimeRange } from '../utils/suggestions';
import { ACTIVITY_CATEGORIES, dpSearch, xhsSearch } from '../utils/activities';

interface SuggestionsProps { group: Group; monday: Date; }

// 大类的配色方案
const CAT_COLORS = [
  { bg: '#fef2f2', accent: '#f43f5e', dot: '#fecdd3', icon: '🍽️' },
  { bg: '#fffbeb', accent: '#d97706', dot: '#fde68a', icon: '🍺' },
  { bg: '#fdf4ff', accent: '#a855f7', dot: '#e9d5ff', icon: '☕' },
  { bg: '#ecfdf5', accent: '#10b981', dot: '#a7f3d0', icon: '🚗' },
  { bg: '#eff6ff', accent: '#3b82f6', dot: '#bfdbfe', icon: '🎬' },
  { bg: '#fff7ed', accent: '#ea580c', dot: '#fed7aa', icon: '🛍️' },
  { bg: '#f0fdf4', accent: '#059669', dot: '#6ee7b7', icon: '💆' },
  { bg: '#fefce8', accent: '#ca8a04', dot: '#fde047', icon: '✈️' },
];

export default function Suggestions({ group, monday }: SuggestionsProps) {
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const expandRef = useRef<HTMLDivElement>(null);

  const scene = SCENE_CATEGORIES.find(s => s.id === activeScene);
  const suggestions = scene ? matchScene(group, monday, scene) : [];

  useEffect(() => {
    if (expanded !== null && expandRef.current) {
      expandRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  // 获取所有场景的建议，取前 3 个匹配最久的作为"推荐精选"
  const allSuggestions = SCENE_CATEGORIES.flatMap(cat =>
    matchScene(group, monday, cat).slice(0, 1)
  ).sort((a, b) => b.duration - a.duration).slice(0, 3);

  return (
    <div style={{ padding: '12px 14px', paddingBottom: 80 }}>
      {/* ====== 精选推荐轮播卡片 ====== */}
      {allSuggestions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <div style={{
              width: 4, height: 20, borderRadius: '4px',
              background: 'linear-gradient(180deg, #6366f1, #a855f7)',
            }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              ✨ 本周精选
            </span>
          </div>

          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto',
            WebkitOverflowScrolling: 'touch', paddingBottom: 4,
          }}>
            {allSuggestions.map((s, i) => {
              const availRatio = s.availableCount / group.members.length;
              const gradientColors = [
                'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                'linear-gradient(135deg, #fffbeb, #fef3c7)',
              ];
              const borderColors = ['#c7d2fe', '#a7f3d0', '#fde68a'];
              const accentColors = ['#6366f1', '#10b981', '#f59e0b'];

              return (
                <div key={i} style={{
                  flexShrink: 0, width: 240,
                  borderRadius: 'var(--radius-lg)',
                  background: gradientColors[i],
                  border: `1px solid ${borderColors[i]}`,
                  padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)',
                  animation: `fadeInUp 0.4s var(--ease-out-expo) ${i * 0.08}s both`,
                }}>
                  {/* 场景标签 */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontWeight: 600, color: accentColors[i],
                    marginBottom: 10,
                  }}>
                    {s.categoryTitle}
                  </div>

                  <div style={{
                    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}>
                    {s.dateLabel}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    ⏰ {formatTimeRange(s.startSlot, s.endSlot)} · {s.duration >= 48 ? `${Math.round(s.duration/24)}天` : `${s.duration}h`}
                  </div>

                  {/* 空闲进度条 */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: 12, fontWeight: 600, marginBottom: 4,
                    }}>
                      <span style={{ color: accentColors[i] }}>
                        {s.availableCount >= 3 ? '🎉 全员有空' : `✌️ ${s.availableCount}人空闲`}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {s.availableCount}/{group.members.length}
                      </span>
                    </div>
                    <div style={{
                      height: 6, borderRadius: '3px',
                      background: 'rgba(255,255,255,0.6)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        width: `${availRatio * 100}%`,
                        background: accentColors[i],
                        transition: 'width 0.5s var(--ease-out-expo)',
                      }} />
                    </div>
                  </div>

                  {/* 活动推荐 */}
                  {s.activities && s.activities.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {s.activities.slice(0, 3).map((a, j) => (
                        <span key={j} style={{
                          padding: '4px 8px', borderRadius: 'var(--radius-xs)',
                          background: 'white', fontSize: 12,
                          boxShadow: 'var(--shadow-xs)',
                        }}>{a.emoji} {a.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== 按时间匹配 ====== */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <div style={{
            width: 4, height: 20, borderRadius: '4px',
            background: 'linear-gradient(180deg, #10b981, #34d399)',
          }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            📅 按时间匹配
          </span>
        </div>

        {/* 场景筛选胶囊 */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingBottom: 4, WebkitOverflowScrolling: 'touch',
        }}>
          {SCENE_CATEGORIES.map(cat => {
            const isActive = activeScene === cat.id;
            const count = isActive ? suggestions.length : matchScene(group, monday, cat).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveScene(isActive ? null : cat.id)}
                className="btn-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 'var(--radius-2xl)',
                  border: isActive ? '2px solid #6366f1' : '1px solid var(--border-default)',
                  background: isActive ? 'var(--primary-ghost)' : 'var(--bg-elevated)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  fontSize: 14, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary-dark)' : 'var(--text-secondary)',
                  transition: 'all 0.2s var(--ease-out-expo)',
                  boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-xs)',
                }}
              >
                <span style={{ fontSize: 20 }}>{cat.icon}</span>
                {cat.title}
                {count > 0 && (
                  <span style={{
                    fontSize: 11, background: isActive ? '#6366f1' : 'var(--bg-muted)',
                    color: isActive ? '#fff' : 'var(--text-tertiary)',
                    borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                    fontWeight: 700, minWidth: 20, textAlign: 'center',
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 匹配结果卡片 */}
        {activeScene && suggestions.length > 0 && (
          <div style={{
            marginTop: 12, display: 'flex', gap: 10,
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
          }}>
            {suggestions.slice(0, 6).map((s, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 185,
                background: s.availableCount >= 3
                  ? 'linear-gradient(180deg, #f0fdf4, #dcfce7)'
                  : 'linear-gradient(180deg, #fffbeb, #fef9c3)',
                border: s.availableCount >= 3 ? '1px solid #86efac' : '1px solid #fde047',
                borderRadius: 'var(--radius-md)', padding: '14px 16px',
                boxShadow: 'var(--shadow-sm)',
                animation: `fadeInUp 0.3s var(--ease-out-expo) ${i * 0.05}s both`,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14 }}>
                  {s.dateLabel}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 12 }}>
                  ⏰ {formatTimeRange(s.startSlot, s.endSlot)} · {s.duration >= 48 ? `${Math.round(s.duration/24)}天` : `${s.duration}h`}
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: s.availableCount >= 3 ? '#16a34a' : '#ca8a04',
                }}>
                  {s.availableCount >= 3 ? '🎉 三人都有空！' : `✌️ ${s.available.join('、')}有空`}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeScene && suggestions.length === 0 && (
          <div style={{
            marginTop: 12, textAlign: 'center', padding: 24,
            background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
            color: 'var(--text-tertiary)', fontSize: 14,
          }}>
            😔 这周似乎找不到合适的时间
          </div>
        )}
      </div>

      {/* ====== 分隔线 ====== */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>💡 灵感发现</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      </div>

      {/* ====== 灵感卡片网格 ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {ACTIVITY_CATEGORIES.map((cat, idx) => {
          const colors = CAT_COLORS[idx % CAT_COLORS.length];
          const isOpen = expanded === idx;

          return (
            <div key={cat.title}
              ref={isOpen ? expandRef : undefined}
              style={isOpen ? { gridColumn: '1 / -1' } : undefined}
            >
              {/* 大类卡片 */}
              <button
                onClick={() => setExpanded(isOpen ? null : idx)}
                className="btn-press card-hover"
                style={{
                  width: '100%', borderRadius: 'var(--radius-md)',
                  border: 'none', cursor: 'pointer',
                  padding: '18px 12px',
                  background: colors.bg,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8, textAlign: 'center',
                  position: 'relative', overflow: 'hidden',
                  boxShadow: isOpen
                    ? `0 4px 16px ${colors.accent}18`
                    : 'var(--shadow-xs)',
                }}
              >
                {/* 装饰元素 */}
                <div style={{
                  position: 'absolute', right: -10, top: -10,
                  width: 48, height: 48, borderRadius: '50%',
                  background: colors.dot, opacity: 0.3,
                }} />
                <div style={{
                  position: 'absolute', left: -6, bottom: -6,
                  width: 28, height: 28, borderRadius: '50%',
                  background: colors.dot, opacity: 0.25,
                }} />

                <span style={{ fontSize: 32, position: 'relative', lineHeight: 1 }}>{cat.icon}</span>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                  }}>{cat.title}</div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2,
                  }}>{cat.desc}</div>
                </div>
                <span style={{
                  fontSize: 11, color: colors.accent, fontWeight: 600,
                  position: 'relative',
                }}>
                  {isOpen ? '收起 ▲' : `${cat.items.length} 种选择`}
                </span>
              </button>

              {/* 展开子类 */}
              {isOpen && (
                <div style={{
                  marginTop: 8, display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 8, animation: 'fadeIn 0.3s var(--ease-out-expo)',
                }}>
                  {cat.items.map((item, j) => (
                    <div key={j} style={{
                      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                      padding: 14, border: '1px solid var(--border-subtle)',
                      boxShadow: 'var(--shadow-xs)',
                      animation: `fadeIn 0.25s var(--ease-out-expo) ${j * 0.04}s both`,
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 22 }}>{item.emoji}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.title}
                          </div>
                          {item.tags && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                              {item.tags.map(tag => (
                                <span key={tag} style={{
                                  fontSize: 10, padding: '1px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                  background: 'var(--bg-subtle)',
                                  color: 'var(--text-tertiary)',
                                }}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                        {item.desc}
                      </div>
                      {item.hot && (
                        <div style={{
                          fontSize: 11, color: '#dc2626',
                          background: 'var(--danger-light)',
                          borderRadius: 'var(--radius-xs)',
                          padding: '3px 8px', marginBottom: 8,
                          display: 'inline-block', fontWeight: 500,
                        }}>
                          🔥 {item.hot}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {item.dpKeyword && (
                          <a href={dpSearch(item.dpKeyword)} target="_blank" rel="noopener noreferrer"
                            style={{
                              flex: 1, textAlign: 'center', padding: '7px',
                              borderRadius: 'var(--radius-xs)',
                              background: '#fff7ed', border: '1px solid #fed7aa',
                              color: '#ea580c', textDecoration: 'none',
                              fontSize: 11, fontWeight: 600,
                            }}>🔍 点评</a>
                        )}
                        {item.xhsKeyword && (
                          <a href={xhsSearch(item.xhsKeyword)} target="_blank" rel="noopener noreferrer"
                            style={{
                              flex: 1, textAlign: 'center', padding: '7px',
                              borderRadius: 'var(--radius-xs)',
                              background: '#fdf2f8', border: '1px solid #fbcfe8',
                              color: '#db2777', textDecoration: 'none',
                              fontSize: 11, fontWeight: 600,
                            }}>📕 小红书</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
