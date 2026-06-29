import { useState, useEffect, useCallback } from 'react';
import type { Group, TabId, Proposal } from './types';
import { getGroup, getProposals } from './api';
import { getMonday } from './utils/time';
import WeekPicker from './components/WeekPicker';
import MemberPicker from './components/MemberPicker';
import MySpace from './components/MySpace';
import SharedSpace from './components/SharedSpace';
import InviteSpace from './components/InviteSpace';
import SetupPage from './components/SetupPage';
import DailyCheckin from './components/DailyCheckin';

function getGroupIdFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('id');
}

const NAV_ITEMS: { id: TabId; icon: string; label: string; color: string }[] = [
  { id: 'my', icon: 'person', label: '个人空间', color: '#6366f1' },
  { id: 'overview', icon: 'people', label: '共享空间', color: '#10b981' },
  { id: 'suggestions', icon: 'lightbulb', label: '约起来', color: '#f59e0b' },
];

function NavIcon({ name, active, color }: { name: string; active: boolean; color: string }) {
  const fill = active ? color : 'none';
  const stroke = active ? 'none' : '#a1a1aa';
  const sw = active ? 0 : 1.8;

  if (name === 'person') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
  if (name === 'people') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 0-5.5 10.85c.34.47.5 1.03.5 1.6V16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.55c0-.57.16-1.13.5-1.6A7 7 0 0 0 12 2z" />
      <line x1="10" y1="19" x2="14" y2="19" />
      <line x1="10" y1="22" x2="14" y2="22" />
    </svg>
  );
}

export default function App() {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('my');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [toast, setToast] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const groupId = getGroupIdFromURL();

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }
    setLoading(true);
    getGroup(groupId)
      .then(g => { setGroup(g); setError(''); })
      .catch(e => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !group) return;
    const t = setInterval(() => {
      getGroup(groupId).then(setGroup).catch(() => {});
      getProposals(groupId).then(setProposals).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [groupId, group?.id]);

  useEffect(() => {
    if (groupId) getProposals(groupId).then(setProposals).catch(() => {});
  }, [groupId]);

  useEffect(() => {
    if (group && selectedMember && activeTab === 'my') {
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayMood = group.moods?.[selectedMember]?.[todayKey];
      if (!todayMood || todayMood === '') setShowCheckin(true);
    }
  }, [group?.id, selectedMember, activeTab]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const handleGroupUpdate = useCallback((g: Group) => setGroup(g), []);
  const handleGroupReady = useCallback((g: Group) => { setGroup(g); setError(''); }, []);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => showToast('✅ 链接已复制')).catch(() => showToast('📋 请长按复制链接'));
  }, []);

  if (!groupId) return <SetupPage onGroupReady={handleGroupReady} />;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: '0 8px 32px rgba(99,102,241,0.25)', animation: 'float 2s ease-in-out infinite' }}>🎯</div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 14, marginTop: 16 }}>加载中...</div>
    </div>
  );

  if (error || !group) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-base)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>加载失败</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, textAlign: 'center' }}>{error || '群组不存在或链接已失效'}</div>
      <button onClick={() => { window.location.href = window.location.pathname; }} style={{ padding: '14px 36px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 28px rgba(99,102,241,0.3)' }}>重新开始</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* 顶部栏 */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(250,249,246,0.78)', backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '6px 12px', paddingTop: 'max(6px, env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: '0 3px 8px rgba(99,102,241,0.2)' }}>🎯</div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
        <button onClick={handleCopyLink} className="btn-press" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </button>
      </header>

      {/* 周选择器 + 成员选择器 */}
      <div style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
        <WeekPicker monday={monday} onWeekChange={setMonday} />
        {activeTab === 'my' && (
          <MemberPicker members={group.members} selected={selectedMember} onSelect={setSelectedMember} moods={group.moods} onCheckin={() => setShowCheckin(true)} />
        )}
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1 }}>
        {activeTab === 'my' && selectedMember && (
          <MySpace group={group} member={selectedMember} monday={monday} onGroupUpdate={handleGroupUpdate} />
        )}
        {activeTab === 'my' && !selectedMember && (
          <div style={{ margin: '64px 24px', textAlign: 'center', padding: 48, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>请先选择你是谁</div>
          </div>
        )}
        {activeTab === 'overview' && <SharedSpace group={group} monday={monday} />}
        {activeTab === 'suggestions' && (
          <InviteSpace group={group} member={selectedMember} monday={monday} proposals={proposals} onProposalsUpdate={setProposals} onOpenAI={() => setActiveTab('my')} />
        )}
      </div>

      {/* 底部导航 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderTop: '1px solid var(--border-subtle)', display: 'flex',
        padding: '4px 6px', paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className="btn-press"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 4px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s', position: 'relative' }}>
              <NavIcon name={item.icon} active={isActive} color={item.color} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{item.label}</span>
              {isActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, borderRadius: 3, background: item.color }} />}
            </button>
          );
        })}
      </nav>

      {/* 签到弹窗 */}
      {showCheckin && <DailyCheckin group={group} member={selectedMember} onClose={() => setShowCheckin(false)} onGroupUpdate={handleGroupUpdate} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: 16, right: 16, background: 'rgba(24, 24, 27, 0.92)', color: '#fff', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, textAlign: 'center', zIndex: 999, backdropFilter: 'blur(12px)', maxWidth: 420, margin: '0 auto', animation: 'fadeInScale 0.3s' }}>{toast}</div>
      )}
    </div>
  );
}
