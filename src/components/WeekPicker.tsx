import { formatWeekLabel, getMonday } from '../utils/time';

interface WeekPickerProps {
  monday: Date;
  onWeekChange: (monday: Date) => void;
}

export default function WeekPicker({ monday, onWeekChange }: WeekPickerProps) {
  const today = getMonday(new Date());
  const isThisWeek = today.getTime() === monday.getTime();

  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-2xl)', padding: '2px', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
      <button onClick={() => { const d = new Date(monday); d.setDate(d.getDate() - 7); onWeekChange(d); }} className="btn-press"
        style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div style={{ textAlign: 'center', padding: '2px 8px', minWidth: 140 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{formatWeekLabel(monday)}</div>
        {!isThisWeek && (
          <button onClick={() => onWeekChange(today)} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '1px 4px' }}>本周</button>
        )}
      </div>
      <button onClick={() => { const d = new Date(monday); d.setDate(d.getDate() + 7); onWeekChange(d); }} className="btn-press"
        style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}
