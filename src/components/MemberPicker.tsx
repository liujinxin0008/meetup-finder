import { toDateKey } from '../utils/time';

interface MemberPickerProps {
  members: string[];
  selected: string;
  onSelect: (member: string) => void;
  moods?: Record<string, Record<string, string>>;
  onCheckin?: () => void;
}

const THEMES = [
  { color: '#6366f1', light: '#eef2ff', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', emoji: '😎' },
  { color: '#10b981', light: '#ecfdf5', gradient: 'linear-gradient(135deg, #10b981, #34d399)', emoji: '🤩' },
  { color: '#f59e0b', light: '#fffbeb', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', emoji: '🥳' },
];

export default function MemberPicker({ members, selected, onSelect, moods, onCheckin }: MemberPickerProps) {
  const todayKey = toDateKey(new Date());

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 4, height: 18, borderRadius: '4px',
            background: 'linear-gradient(180deg, #6366f1, #a855f7)',
            display: 'inline-block',
          }} />
          我是谁？
        </span>
        {onCheckin && (
          <button
            onClick={onCheckin}
            className="btn-press"
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-2xl)',
              border: '1.5px solid #ddd6fe',
              background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
              color: '#7c3aed', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99,102,241,0.1)',
            }}
          >
            ✨ 今日签到
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {members.map((member, i) => {
          const theme = THEMES[i % THEMES.length];
          const isActive = member === selected;
          const todayMood = moods?.[member]?.[todayKey] || '';

          return (
            <button
              key={member}
              onClick={() => onSelect(member)}
              className="btn-press"
              style={{
                flex: 1, padding: '16px 10px', borderRadius: 'var(--radius-md)',
                border: isActive ? `2px solid ${theme.color}` : '2px solid transparent',
                background: isActive ? theme.light : 'var(--bg-elevated)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, transition: 'all 0.25s var(--ease-out-expo)',
                boxShadow: isActive
                  ? `0 4px 20px ${theme.color}20`
                  : 'var(--shadow-xs)',
              }}
            >
              {/* 头像 */}
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: isActive ? theme.gradient : 'var(--bg-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
                boxShadow: isActive ? `0 6px 16px ${theme.color}30` : 'none',
                transition: 'all 0.25s var(--ease-out-expo)',
              }}>
                {theme.emoji}
              </div>

              {/* 名字 */}
              <div style={{
                fontSize: 14, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}>
                {member}
              </div>

              {/* 今日心情 */}
              {todayMood ? (
                <div style={{
                  fontSize: 20, padding: '4px 10px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  {todayMood}
                </div>
              ) : (
                <div style={{
                  fontSize: 11, color: 'var(--text-tertiary)',
                  padding: '2px 8px',
                }}>
                  未签到
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
