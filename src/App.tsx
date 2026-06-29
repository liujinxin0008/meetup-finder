import { useState, useEffect, useCallback } from 'react';
import type { Group, TabId, Proposal } from './types';
import { getGroup, getProposals } from './api';
import { getMonday } from './utils/time';
import WeekPicker from './components/WeekPicker';
import MemberPicker from './components/MemberPicker';
import ScheduleGrid from './components/ScheduleGrid';
import OverviewGrid from './components/OverviewGrid';
import Suggestions from './components/Suggestions';
import SetupPage from './components/SetupPage';
import DailyCheckin from './components/DailyCheckin';
import Assistant from './components/Assistant';
import ProposalCard from './components/ProposalCard';
import SuggestionPopup, { type Suggestion } from './components/SuggestionPopup';

function getGroupIdFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('id');
}

const NAV_ITEMS: { id: TabId; icon: string; label: string; color: string }[] = [
  { id: 'my', icon: 'calendar', label: '我的日程', color: '#6366f1' },
  { id: 'overview', icon: 'people', label: '大家时间', color: '#10b981' },
  { id: 'suggestions', icon: 'lightbulb', label: '灵感发现', color: '#f59e0b' },
];

// 简洁的 SVG 图标组件
function NavIcon({ name, active, color }: { name: string; active: boolean; color: string }) {
  const fill = active ? color : 'none';
  const stroke = active ? 'none' : '#a1a1aa';
  const strokeWidth = active ? 0 : 1.8;

  switch (name) {
    case 'calendar':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          {active && <rect x="8" y="13" width="3" height="3" rx="1" fill="white" />}
          {active && <rect x="13" y="13" width="3" height="3" rx="1" fill="white" />}
          {active && <rect x="8" y="18" width="3" height="3" rx="1" fill="white" />}
        </svg>
      );
    case 'people':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="7" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M4 21c0-4 2.5-6 5-6s5 2 5 6" />
          <path d="M12 21c0-3 1.5-4.5 3.5-4.5s3.5 1.5 3.5 4.5" />
          {active && <circle cx="9" cy="7" r="3" fill="white" />}
          {active && <circle cx="17" cy="9" r="2.5" fill="white" />}
        </svg>
      );
    case 'lightbulb':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 0-5.5 10.85c.34.47.5 1.03.5 1.6V16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.55c0-.57.16-1.13.5-1.6A7 7 0 0 0 12 2z" />
          <line x1="10" y1="19" x2="14" y2="19" />
          <line x1="10" y1="22" x2="14" y2="22" />
          {active && <line x1="9" y1="10" x2="9" y2="10" stroke="white" strokeWidth="3" strokeLinecap="round" />}
          {active && <line x1="12" y1="9" x2="12" y2="9" stroke="white" strokeWidth="3" strokeLinecap="round" />}
          {active && <line x1="15" y1="10" x2="15" y2="10" stroke="white" strokeWidth="3" strokeLinecap="round" />}
        </svg>
      );
    default:
      return null;
  }
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
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);

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

  // 首次加载邀约
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
    const copied = navigator.clipboard
      ? navigator.clipboard.writeText(url).then(() => true).catch(() => fallbackCopy(url))
      : Promise.resolve(fallbackCopy(url));
    copied.then(ok => showToast(ok ? '✅ 链接已复制，发到微信群吧' : '📋 请长按复制链接'));
  }, []);

  // ---- 加载状态 ----
  if (!groupId) return <SetupPage onGroupReady={handleGroupReady} />;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
          animation: 'float 2s ease-in-out infinite',
        }}>🎯</div>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 14, marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-base)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>加载失败</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, textAlign: 'center' }}>{error || '群组不存在或链接已失效'}</div>
        <button
          onClick={() => { window.location.href = window.location.pathname; }}
          style={{
            padding: '14px 36px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 8px 28px rgba(99,102,241,0.3)',
          }}
          className="btn-press"
        >重新开始</button>
      </div>
    );
  }

  const currentNav = NAV_ITEMS.find(n => n.id === activeTab)!;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* ====== 顶部毛玻璃 Header ====== */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(250,249,246,0.78)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 16px',
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Logo */}
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
          boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
        }}>🎯</div>

        {/* 群名 + 当前页面 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
            lineHeight: 1.3, letterSpacing: '-0.3px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{group.name}</div>
          <div style={{
            fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: currentNav.color, display: 'inline-block',
            }} />
            {currentNav.label}
          </div>
        </div>

        {/* 分享按钮 */}
        <button
          onClick={handleCopyLink}
          className="btn-press"
          title="分享链接"
          style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', transition: 'all 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </header>

      {/* ====== 周选择器 ====== */}
      <WeekPicker monday={monday} onWeekChange={setMonday} />

      {/* ====== 内容区 ====== */}
      <main style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        paddingBottom: 80, // 为底部导航留空间
      }}>
        <div className="tab-enter" key={activeTab}>
          {activeTab === 'my' && (
            <>
              <MemberPicker
                members={group.members}
                selected={selectedMember}
                onSelect={setSelectedMember}
                moods={group.moods}
                onCheckin={() => setShowCheckin(true)}
              />
              {selectedMember && (
                <ProposalCard
                  groupId={group.id}
                  proposals={proposals}
                  currentMember={selectedMember}
                  onUpdate={setProposals}
                />
              )}
              {selectedMember ? (
                <ScheduleGrid group={group} member={selectedMember} monday={monday} onGroupUpdate={handleGroupUpdate} />
              ) : (
                <div style={{
                  margin: '48px 24px', textAlign: 'center',
                  padding: 48, background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    请先选择你是谁
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                    点击上方你的名字，然后开始填写日程
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'overview' && <OverviewGrid group={group} monday={monday} />}
          {activeTab === 'suggestions' && <Suggestions group={group} monday={monday} />}
        </div>
      </main>

      {/* ====== 底部导航栏 ====== */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        padding: '6px 8px',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="btn-press"
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '8px 4px',
                borderRadius: 'var(--radius-md)',
                border: 'none', cursor: 'pointer',
                background: 'transparent',
                transition: 'all 0.2s var(--ease-out-expo)',
                position: 'relative',
              }}
            >
              <NavIcon name={item.icon} active={isActive} color={item.color} />
              <span style={{
                fontSize: 11, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                letterSpacing: '0.3px',
              }}>{item.label}</span>
              {/* 激活指示器 */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 3, borderRadius: '3px',
                  background: item.color,
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ====== 签到弹窗 ====== */}
      {showCheckin && (
        <DailyCheckin group={group} member={selectedMember} onClose={() => setShowCheckin(false)} onGroupUpdate={handleGroupUpdate} />
      )}

      {/* ====== 浮动 AI 助手 ====== */}
      {selectedMember && (
        <Assistant group={group} member={selectedMember} onGroupUpdate={handleGroupUpdate}
          onSuggestions={(items) => setAiSuggestions(prev => [...prev, ...items])}
        />
      )}

      {/* ====== AI 建议弹窗 ====== */}
      <SuggestionPopup suggestions={aiSuggestions} onDismiss={(id) => setAiSuggestions(prev => prev.filter(s => s.id !== id))} />

      {/* ====== Toast ====== */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: 16, right: 16,
          background: 'rgba(24, 24, 27, 0.92)', color: '#fff',
          padding: '14px 18px', borderRadius: 'var(--radius-md)',
          fontSize: 14, textAlign: 'center', zIndex: 999,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'var(--shadow-lg)', animation: 'fadeInScale 0.3s var(--ease-spring)',
          maxWidth: 420, margin: '0 auto',
        }}>{toast}</div>
      )}
    </div>
  );
}

function fallbackCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;font-size:16px';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); document.body.removeChild(ta); return true; }
  catch { document.body.removeChild(ta); return false; }
}
