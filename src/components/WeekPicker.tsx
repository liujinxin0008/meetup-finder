import { formatWeekLabel, getMonday } from '../utils/time';

interface WeekPickerProps {
  monday: Date;
  onWeekChange: (monday: Date) => void;
}

export default function WeekPicker({ monday, onWeekChange }: WeekPickerProps) {
  const today = getMonday(new Date());
  const isThisWeek = today.getTime() === monday.getTime();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '10px 14px',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-2xl)',
        padding: '4px',
        boxShadow: 'var(--shadow-xs)',
        border: '1px solid var(--border-subtle)',
      }}>
        {/* 左箭头 */}
        <button
          onClick={() => { const d = new Date(monday); d.setDate(d.getDate() - 7); onWeekChange(d); }}
          className="btn-press"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: 'none',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* 周期标签 */}
        <div style={{ textAlign: 'center', padding: '4px 12px', minWidth: 160 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.2px',
          }}>
            {formatWeekLabel(monday)}
          </div>
          {!isThisWeek && (
            <button
              onClick={() => onWeekChange(today)}
              style={{
                background: 'none', border: 'none',
                color: '#6366f1', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', padding: '2px 8px', marginTop: 2,
              }}
            >
              回到本周
            </button>
          )}
        </div>

        {/* 右箭头 */}
        <button
          onClick={() => { const d = new Date(monday); d.setDate(d.getDate() + 7); onWeekChange(d); }}
          className="btn-press"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: 'none',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
