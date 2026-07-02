import { toDateKey } from '../utils/time';

interface Props {
  members: string[]; selected: string; onSelect: (m: string) => void;
  moods?: Record<string, Record<string, string>>; onCheckin?: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

export default function MemberPicker({ members, selected, onSelect, moods, onCheckin }: Props) {
  const todayKey = toDateKey(new Date());
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      {members.map((m, i) => {
        const active = m === selected;
        const mood = moods?.[m]?.[todayKey] || '';
        return (
          <button key={m} onClick={() => onSelect(m)} className="btn-press"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--radius-xl)', border: active ? `2px solid ${COLORS[i]}` : '1px solid var(--border-default)', background: active ? `${COLORS[i]}10` : 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? COLORS[i] : 'var(--text-secondary)' }}>
            <span style={{ fontSize: 12 }}>{mood || '😶'}</span>
            {m}
          </button>
        );
      })}
      {onCheckin && (
        <button onClick={onCheckin} className="btn-press"
          style={{ padding: '4px 10px', borderRadius: 'var(--radius-xl)', border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#7c3aed', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginLeft: 4, whiteSpace: 'nowrap' }}>✨签到</button>
      )}
    </div>
  );
}
