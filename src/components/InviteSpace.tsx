import { useState } from 'react';
import type { Group, Proposal } from '../types';
import { SCENE_CATEGORIES } from '../types';
import { matchScene, formatTimeRange } from '../utils/suggestions';
import { ACTIVITY_CATEGORIES, dpSearch, xhsHomePage, copyKeyword } from '../utils/activities';
import { respondProposal, updateSchedule } from '../api';

interface Props {
  group: Group;
  member: string;
  monday: Date;
  proposals: Proposal[];
  onProposalsUpdate: (p: Proposal[]) => void;
  onOpenAI: () => void;
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

export default function InviteSpace({ group, member, monday, proposals, onProposalsUpdate, onOpenAI }: Props) {
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [responding, setResponding] = useState<string | null>(null);

  const scene = SCENE_CATEGORIES.find(s => s.id === activeScene);
  const suggestions = scene ? matchScene(group, monday, scene) : [];
  const allSuggestions = SCENE_CATEGORIES.flatMap(cat => matchScene(group, monday, cat).slice(0, 1))
    .sort((a, b) => b.duration - a.duration).slice(0, 3);

  const handleRespond = async (p: Proposal, resp: 'yes' | 'no') => {
    setResponding(p.id);
    try {
      await respondProposal(group.id, p.id, member, resp);
      if (resp === 'yes') {
        const daySched: Record<string, string> = {};
        for (let h = parseInt(p.startSlot); h < parseInt(p.endSlot); h++) {
          daySched[`${String(h).padStart(2, '0')}:00`] = p.activity;
        }
        try { await updateSchedule(group.id, member, p.dateKey, daySched); } catch {}
      }
      onProposalsUpdate(proposals.map(pp =>
        pp.id === p.id ? { ...pp, responses: { ...pp.responses, [member]: resp } } : pp
      ));
    } catch {}
    setResponding(null);
  };

  const myPending = proposals.filter(p => p.responses[member] === 'pending' && p.from !== member);

  return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, overflowY: 'auto', height: 'calc(100vh - 140px)' }}>
      {/* 待处理的邀约 */}
      {myPending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            🔔 有人约你 ({myPending.length})
          </div>
          {myPending.map(p => (
            <div key={p.id} style={{
              marginBottom: 8, borderRadius: 'var(--radius-md)',
              border: '2px solid #f59e0b', overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(245,158,11,0.15)',
            }}>
              <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>📩</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.from} 约你 {p.activity}</div>
                  <div style={{ fontSize: 11, color: '#92400e' }}>{p.dateLabel} {p.startSlot}:00-{p.endSlot}:00</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#fff' }}>
                <button onClick={() => handleRespond(p, 'yes')} disabled={responding === p.id} className="btn-press"
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >✅ 去！</button>
                <button onClick={() => handleRespond(p, 'no')} disabled={responding === p.id} className="btn-press"
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >❌ 没空</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI 推荐 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 4, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #6366f1, #a855f7)' }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>🤖 AI 推荐</span>
          <button onClick={onOpenAI} className="btn-press"
            style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#6366f1', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >💬 聊聊</button>
        </div>
        {allSuggestions.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {allSuggestions.map((s, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 180, padding: '12px 14px',
                borderRadius: 'var(--radius-md)', background: '#eef2ff', border: '1px solid #c7d2fe',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{s.dateLabel}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  ⏰ {formatTimeRange(s.startSlot, s.endSlot)} · {s.availableCount}人空
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {s.activities?.slice(0, 3).map(a => `${a.emoji}${a.title}`).join(' ')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            暂时没有匹配的时间，试试跟 AI 聊聊？
          </div>
        )}
      </div>

      {/* 活跃邀约 */}
      {proposals.filter(p => p.responses[member] !== 'pending' || p.from === member).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            📩 进行中的邀约
          </div>
          {proposals.filter(p => p.responses[member] !== 'pending' || p.from === member).map(p => (
            <div key={p.id} style={{
              marginBottom: 6, padding: '8px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.from} 发起 {p.activity}</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.dateLabel}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(p.responses).map(([m, r]) => (
                  <span key={m} style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                    background: r === 'yes' ? '#d1fae5' : r === 'no' ? '#fee2e2' : '#fef3c7',
                    color: r === 'yes' ? '#065f46' : r === 'no' ? '#991b1b' : '#92400e',
                  }}>{m} {r === 'yes' ? '✅' : r === 'no' ? '❌' : '❓'}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 按时间匹配 */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📅 按时间匹配</div>
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
                }}
              >{cat.icon} {cat.title}</button>
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

      {/* 热门活动 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔥 灵感发现</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ACTIVITY_CATEGORIES.map((cat, idx) => {
            const colors = CAT_COLORS[idx % CAT_COLORS.length];
            const isOpen = expanded === idx;
            return (
              <div key={cat.title} style={isOpen ? { gridColumn: '1 / -1' } : undefined}>
                <button onClick={() => setExpanded(isOpen ? null : idx)} className="btn-press card-hover"
                  style={{
                    width: '100%', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    padding: '12px 8px', background: colors.bg, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4, textAlign: 'center', position: 'relative', overflow: 'hidden',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{cat.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{cat.items.length} 种</div>
                </button>
                {isOpen && (
                  <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {cat.items.map((item, j) => (
                      <div key={j} style={{
                        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                        background: '#fff', border: '1px solid var(--border-subtle)', fontSize: 11,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <span>{item.emoji}</span>
                          <span style={{ fontWeight: 700 }}>{item.title}</span>
                        </div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{item.desc}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          {item.dpKeyword && (
                            <a href={dpSearch(item.dpKeyword)} target="_blank" rel="noopener noreferrer"
                              style={{ flex: 1, textAlign: 'center', padding: '3px', borderRadius: 4, background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', textDecoration: 'none', fontSize: 9, fontWeight: 600 }}
                            >🔍</a>
                          )}
                          {item.xhsKeyword && (
                            <a href={xhsHomePage()} target="_blank" rel="noopener noreferrer"
                              onClick={async (e) => { e.preventDefault(); await copyKeyword(item.xhsKeyword!); window.open(xhsHomePage(), '_blank'); }}
                              style={{ flex: 1, textAlign: 'center', padding: '3px', borderRadius: 4, background: '#fdf2f8', border: '1px solid #fbcfe8', color: '#db2777', textDecoration: 'none', fontSize: 9, fontWeight: 600 }}
                            >📕</a>
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
