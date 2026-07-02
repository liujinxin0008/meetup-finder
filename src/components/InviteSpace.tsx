import { useState } from 'react';
import type { Group } from '../types';
import { SCENE_CATEGORIES } from '../types';
import { matchScene, formatTimeRange } from '../utils/suggestions';
import { ACTIVITY_CATEGORIES, dpSearch, xhsHomePage, copyKeyword } from '../utils/activities';

interface Props {
  group: Group;
  monday: Date;
}

const CAT_COLORS = [
  { bg: '#fef2f2', accent: '#f43f5e', dot: '#fecdd3' },
  { bg: '#fffbeb', accent: '#d97706', dot: '#fde68a' },
  { bg: '#fdf4ff', accent: '#a855f7', dot: '#e9d5ff' },
  { bg: '#ecfdf5', accent: '#10b981', dot: '#a7f3d0' },
  { bg: '#eff6ff', accent: '#3b82f6', dot: '#bfdbfe' },
  { bg: '#fff7ed', accent: '#ea580c', dot: '#fed7aa' },
  { bg: '#f0fdf4', accent: '#059669', dot: '#6ee7b7' },
  { bg: '#fefce8', accent: '#ca8a04', dot: '#fde047' },
];

export default function InviteSpace({ group, monday }: Props) {
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const scene = SCENE_CATEGORIES.find(s => s.id === activeScene);
  const suggestions = scene ? matchScene(group, monday, scene) : [];
  const allSuggestions = SCENE_CATEGORIES.flatMap(cat => matchScene(group, monday, cat).slice(0, 1))
    .sort((a, b) => b.duration - a.duration).slice(0, 4);

  return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, overflowY: 'auto', height: 'calc(100vh - 140px)' }}>
      {/* ====== 🤖 AI 推荐 ====== */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #a855f7)' }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>🤖 AI 推荐</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>基于三个人的时间</span>
        </div>
        {allSuggestions.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {allSuggestions.map((s, i) => (
              <div key={i} style={{
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: s.availableCount >= 3 ? 'linear-gradient(135deg, #f0fdf4, #d1fae5)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                border: s.availableCount >= 3 ? '1px solid #86efac' : '1px solid #fde047',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.dateLabel}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  ⏰ {formatTimeRange(s.startSlot, s.endSlot)} · {s.duration >= 48 ? `${Math.round(s.duration / 24)}天` : `${s.duration}h`}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: s.availableCount >= 3 ? '#16a34a' : '#ca8a04' }}>
                  {s.availableCount >= 3 ? '🎉 三人都有空！' : `✌️ ${s.available.join('、')}有空`}
                </div>
                {s.activities && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                    {s.activities.slice(0, 4).map((a, j) => (
                      <span key={j} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: '#fff', boxShadow: 'var(--shadow-xs)' }}>
                        {a.emoji} {a.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            暂时没有匹配的时间，去"个人空间"更新日程后再来看看
          </div>
        )}
      </div>

      {/* ====== 按时间匹配 ====== */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #10b981, #34d399)' }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>📅 按时间匹配</span>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {SCENE_CATEGORIES.map(cat => {
            const isActive = activeScene === cat.id;
            return (
              <button key={cat.id} onClick={() => setActiveScene(isActive ? null : cat.id)} className="btn-press"
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-2xl)', whiteSpace: 'nowrap', flexShrink: 0,
                  border: isActive ? '2px solid #6366f1' : '1px solid var(--border-default)',
                  background: isActive ? '#eef2ff' : '#fff', cursor: 'pointer',
                  fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#4f46e5' : '#475569',
                }}>{cat.icon} {cat.title}</button>
            );
          })}
        </div>
        {activeScene && suggestions.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {suggestions.slice(0, 5).map((s, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 170, padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: s.availableCount >= 3 ? '#f0fdf4' : '#fffbeb',
                border: s.availableCount >= 3 ? '1px solid #86efac' : '1px solid #fde047',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{s.dateLabel}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatTimeRange(s.startSlot, s.endSlot)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====== 灵感发现 ====== */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #f59e0b, #fbbf24)' }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>🔥 灵感发现</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ACTIVITY_CATEGORIES.map((cat, idx) => {
            const colors = CAT_COLORS[idx % CAT_COLORS.length];
            const isOpen = expanded === idx;
            return (
              <div key={cat.title} style={isOpen ? { gridColumn: '1 / -1' } : undefined}>
                <button onClick={() => setExpanded(isOpen ? null : idx)} className="btn-press card-hover"
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', padding: '16px 10px', background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ position: 'absolute', right: -8, top: -8, width: 36, height: 36, borderRadius: '50%', background: colors.dot, opacity: 0.3 }} />
                  <span style={{ fontSize: 28, position: 'relative' }}>{cat.icon}</span>
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{cat.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{cat.desc}</div>
                  </div>
                  <span style={{ fontSize: 10, color: colors.accent, fontWeight: 600 }}>{cat.items.length} 种选择</span>
                </button>
                {isOpen && (
                  <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {cat.items.map((item, j) => (
                      <div key={j} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>{item.emoji}</span>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{item.title}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>{item.desc}</div>
                        {item.hot && <div style={{ fontSize: 10, color: '#dc2626', background: '#fef2f2', borderRadius: 4, padding: '2px 6px', marginBottom: 4, display: 'inline-block' }}>🔥 {item.hot}</div>}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {item.dpKeyword && (
                            <a href={dpSearch(item.dpKeyword)} target="_blank" rel="noopener noreferrer"
                              style={{ flex: 1, textAlign: 'center', padding: '5px', borderRadius: 4, background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', textDecoration: 'none', fontSize: 10, fontWeight: 600 }}>🔍 点评</a>
                          )}
                          {item.xhsKeyword && (
                            <a href={xhsHomePage()} target="_blank" rel="noopener noreferrer"
                              onClick={async (e) => { e.preventDefault(); await copyKeyword(item.xhsKeyword!); window.open(xhsHomePage(), '_blank'); }}
                              style={{ flex: 1, textAlign: 'center', padding: '5px', borderRadius: 4, background: '#fdf2f8', border: '1px solid #fbcfe8', color: '#db2777', textDecoration: 'none', fontSize: 10, fontWeight: 600 }}>📕 小红书</a>
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
    </div>
  );
}
