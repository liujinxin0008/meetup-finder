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
  { id: 'my', icon: 'person', label: '个人', color: '#6366f1' },
  { id: 'overview', icon: 'people', label: '大家', color: '#10b981' },
  { id: 'suggestions', icon: 'lightbulb', label: '灵感', color: '#f59e0b' },
];

interface TodoItem { id: string; text: string; done: boolean; dateKey?: string; slot?: string; }

function NavIcon({ name, active, color }: { name: string; active: boolean; color: string }) {
  const fill = active ? color : 'none'; const stroke = active ? 'none' : '#a1a1aa'; const sw = active ? 0 : 1.8;
  if (name === 'person') return <svg width="22" height="22" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  if (name === 'people') return <svg width="22" height="22" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-5.5 10.85c.34.47.5 1.03.5 1.6V16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.55c0-.57.16-1.13.5-1.6A7 7 0 0 0 12 2z"/><line x1="10" y1="19" x2="14" y2="19"/><line x1="10" y1="22" x2="14" y2="22"/></svg>;
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
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const groupId = getGroupIdFromURL();

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }
    setLoading(true);
    getGroup(groupId).then(g => { setGroup(g); setError(''); }).catch(e => setError(e.message || '加载失败')).finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !group) return;
    const t = setInterval(() => { getGroup(groupId).then(setGroup).catch(() => {}); getProposals(groupId).then(setProposals).catch(() => {}); }, 30000);
    return () => clearInterval(t);
  }, [groupId, group?.id]);

  useEffect(() => { if (groupId) getProposals(groupId).then(setProposals).catch(() => {}); }, [groupId]);

  // 签到：只在当前会话第一次选人时弹
  useEffect(() => {
    if (group && selectedMember && activeTab === 'my') {
      const key = `checkin-${group.id}-${selectedMember}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        setShowCheckin(true);
      }
    }
  }, [group?.id, selectedMember]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const handleGroupUpdate = useCallback((g: Group) => setGroup(g), []);
  const handleGroupReady = useCallback((g: Group) => { setGroup(g); setError(''); }, []);

  if (!groupId) return <SetupPage onGroupReady={handleGroupReady} />;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: '0 8px 32px rgba(99,102,241,0.25)', animation: 'float 2s ease-in-out infinite' }}>🎯</div>
    </div>
  );

  if (error || !group) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-base)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>加载失败</div>
      <button onClick={() => window.location.href = window.location.pathname} style={{ padding: '14px 36px', borderRadius: 'var(--radius-lg)', background: '#6366f1', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>重新开始</button>
    </div>
  );

  const showMemberSelect = activeTab === 'my' && !selectedMember;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部栏 */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,249,246,0.78)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎯</div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
        <WeekPicker monday={monday} onWeekChange={setMonday} />
        <MemberPicker members={group.members} selected={selectedMember} onSelect={(m) => { setSelectedMember(m); if (activeTab !== 'my') setActiveTab('my'); }} moods={group.moods} onCheckin={() => setShowCheckin(true)} />
      </header>

      {/* 内容 */}
      <div style={{ flex: 1 }}>
        {showMemberSelect && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(2px)' }}>
            <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-xl)', animation: 'popIn 0.4s var(--ease-spring)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>你是谁？</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>选一下，帮你记住日程</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.members.map((m, i) => (
                  <button key={m} onClick={() => setSelectedMember(m)} className="btn-press"
                    style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: ['#6366f1', '#10b981', '#f59e0b'][i] }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my' && selectedMember && (
          <MySpace group={group} member={selectedMember} monday={monday} onGroupUpdate={handleGroupUpdate} todos={todos} onTodosChange={setTodos} />
        )}
        {activeTab === 'overview' && (
          <SharedSpace group={group} monday={monday} member={selectedMember || group.members[0]} proposals={proposals} onProposalsUpdate={setProposals} />
        )}
        {activeTab === 'suggestions' && (
          <InviteSpace group={group} monday={monday} />
        )}
      </div>

      {/* 底部导航 */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', borderTop: '1px solid var(--border-subtle)', display: 'flex', padding: '3px 6px', paddingBottom: 'max(3px, env(safe-area-inset-bottom))' }}>
        {NAV_ITEMS.map(item => { const isActive = activeTab === item.id; return (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className="btn-press" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '4px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: 'transparent', position: 'relative' }}>
            <NavIcon name={item.icon} active={isActive} color={item.color} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{item.label}</span>
            {isActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 18, height: 2, borderRadius: 2, background: item.color }} />}
          </button>
        );})}
      </nav>

      {showCheckin && selectedMember && <DailyCheckin group={group} member={selectedMember} onClose={() => setShowCheckin(false)} onGroupUpdate={handleGroupUpdate} />}
      {toast && <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16, background: 'rgba(24,24,27,0.92)', color: '#fff', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, textAlign: 'center', zIndex: 999, maxWidth: 400, margin: '0 auto', animation: 'fadeInScale 0.3s' }}>{toast}</div>}
    </div>
  );
}
