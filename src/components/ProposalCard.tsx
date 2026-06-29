import { useState } from 'react';
import type { Proposal } from '../types';
import { respondProposal } from '../api';

interface Props {
  groupId: string;
  proposals: Proposal[];
  currentMember: string;
  onUpdate: (proposals: Proposal[]) => void;
}

export default function ProposalCard({ groupId, proposals, currentMember, onUpdate }: Props) {
  const [responding, setResponding] = useState<string | null>(null);

  const handleRespond = async (p: Proposal, response: 'yes' | 'no') => {
    setResponding(p.id);
    try {
      await respondProposal(groupId, p.id, currentMember, response);
      const updated = proposals.map(pp => {
        if (pp.id !== p.id) return pp;
        return { ...pp, responses: { ...pp.responses, [currentMember]: response } };
      });
      onUpdate(updated);
    } catch {}
    setResponding(null);
  };

  if (proposals.length === 0) return null;

  const myPending = proposals.filter(p =>
    p.responses[currentMember] === 'pending' && p.from !== currentMember
  );
  const mySent = proposals.filter(p => p.from === currentMember);
  const all = proposals.filter(p =>
    !myPending.includes(p) && !mySent.includes(p)
  );

  return (
    <div style={{ padding: '0 12px 8px' }}>
      {/* 待我响应 */}
      {myPending.length > 0 && myPending.map(p => (
        <ProposalItem key={p.id} p={p} type="pending" currentMember={currentMember}
          responding={responding} onRespond={handleRespond} />
      ))}

      {/* 我发起的 */}
      {mySent.length > 0 && mySent.map(p => (
        <ProposalItem key={p.id} p={p} type="sent" currentMember={currentMember}
          responding={responding} onRespond={handleRespond} />
      ))}

      {/* 其他的 */}
      {all.length > 0 && all.map(p => (
        <ProposalItem key={p.id} p={p} type="other" currentMember={currentMember}
          responding={responding} onRespond={handleRespond} />
      ))}
    </div>
  );
}

function ProposalItem({ p, type, currentMember, responding, onRespond }: {
  p: Proposal; type: 'pending' | 'sent' | 'other';
  currentMember: string; responding: string | null;
  onRespond: (p: Proposal, r: 'yes' | 'no') => void;
}) {
  const yesCount = Object.values(p.responses).filter(r => r === 'yes').length;
  const noCount = Object.values(p.responses).filter(r => r === 'no').length;
  const pendingCount = Object.values(p.responses).filter(r => r === 'pending').length;

  return (
    <div style={{
      marginBottom: 8, borderRadius: 'var(--radius-md)',
      border: type === 'pending' ? '2px solid #6366f1' : '1px solid var(--border-default)',
      overflow: 'hidden',
      boxShadow: type === 'pending' ? '0 2px 12px rgba(99,102,241,0.15)' : 'var(--shadow-xs)',
      animation: type === 'pending' ? 'float 2s ease-in-out infinite' : 'none',
    }}>
      {/* 头部 */}
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
        background: type === 'pending' ? 'linear-gradient(135deg, #eef2ff, #ede9fe)' : 'var(--bg-subtle)',
      }}>
        <span style={{ fontSize: 20 }}>{getActivityIcon(p.activity)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {type === 'pending' && '🔔 '}
            {p.from} 约你 {p.activity}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {p.dateLabel} {p.startSlot}-{p.endSlot}
            {p.note && ` · "${p.note}"`}
          </div>
        </div>
        {/* 状态标签 */}
        <div style={{ fontSize: 11, fontWeight: 600 }}>
          {type === 'pending' ? (
            <span style={{ color: '#6366f1', background: '#e0e7ff', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>等你回复</span>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>
              {yesCount}✅ {noCount}❌ {pendingCount > 0 ? `${pendingCount}❓` : ''}
            </span>
          )}
        </div>
      </div>

      {/* 响应按钮 */}
      {type === 'pending' && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px' }}>
          <button
            onClick={() => onRespond(p, 'yes')}
            disabled={responding === p.id}
            className="btn-press"
            style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.2)',
            }}
          >✅ 去！</button>
          <button
            onClick={() => onRespond(p, 'no')}
            disabled={responding === p.id}
            className="btn-press"
            style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
          >❌ 没空</button>
        </div>
      )}

      {/* 响应状态条 */}
      {type !== 'pending' && (
        <div style={{ padding: '8px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(p.responses).map(([m, r]) => (
            <span key={m} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: r === 'yes' ? '#d1fae5' : r === 'no' ? '#fee2e2' : '#fef3c7',
              color: r === 'yes' ? '#065f46' : r === 'no' ? '#991b1b' : '#92400e',
            }}>{m} {r === 'yes' ? '✅' : r === 'no' ? '❌' : '❓'}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function getActivityIcon(activity: string): string {
  const map: Record<string, string> = {
    '吃饭': '🍲', '火锅': '🍲', '日料': '🍣', '烧烤': '🍖', '喝酒': '🍺',
    '咖啡': '☕', '爬山': '⛰️', '看电影': '🎬', '桌游': '🎱', 'KTV': '🎤',
    '约会': '💕', '健身': '🏃', '逛街': '🛍️', '旅游': '✈️',
  };
  return map[activity] || '📌';
}
