import type { TabId } from '../types';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: string; color: string }[] = [
  { id: 'my', label: '我的日程', icon: '📋', color: '#6366f1' },
  { id: 'overview', label: '大家时间', icon: '👥', color: '#10b981' },
  { id: 'suggestions', label: '灵感发现', icon: '💡', color: '#f59e0b' },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav style={{
      display: 'flex', background: '#fff',
      borderBottom: '1px solid #f1f5f9',
      position: 'sticky', top: '64px', zIndex: 99,
      padding: '4px 8px',
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none',
              background: isActive ? `${tab.color}10` : 'transparent',
              color: isActive ? tab.color : '#94a3b8',
              fontSize: '13px', fontWeight: isActive ? 700 : 500,
              cursor: 'pointer', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: '17px' }}>{tab.icon}</span>
            {tab.label}
            {isActive && (
              <div style={{
                position: 'absolute', bottom: '-4px', left: '50%',
                transform: 'translateX(-50%)',
                width: '20px', height: '3px', borderRadius: '2px',
                background: tab.color,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
