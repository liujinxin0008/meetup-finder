import { useState } from 'react';
import { createGroup } from '../api';
import type { Group } from '../types';

interface SetupPageProps {
  onGroupReady: (group: Group) => void;
}

const AVATAR_EMOJIS = ['😎', '🤩', '🥳'];
const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#10b981', '#34d399'],
  ['#f59e0b', '#fbbf24'],
];

export default function SetupPage({ onGroupReady }: SetupPageProps) {
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState(['', '', '']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleMemberChange = (index: number, value: string) => {
    const next = [...members];
    next[index] = value;
    setMembers(next);
  };

  const handleCreate = async () => {
    const validMembers = members.map(m => m.trim()).filter(Boolean);
    if (validMembers.length < 2) {
      setError('请至少填写 2 个成员');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const group = await createGroup(groupName.trim() || '我们的聚会', validMembers);
      const url = new URL(window.location.href);
      url.searchParams.set('id', group.id);
      window.history.replaceState({}, '', url.toString());
      onGroupReady(group as Group);
    } catch (e: any) {
      setError(e.message || '创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24,
      background: 'var(--bg-base)',
    }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center', marginBottom: 32,
        animation: 'fadeInUp 0.6s var(--ease-out-expo)',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 12px 48px rgba(99,102,241,0.3)',
          animation: 'float 3s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 44 }}>🎯</span>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: 'var(--text-primary)',
          margin: '0 0 8px', letterSpacing: '-1px', fontFamily: 'var(--font-display)',
        }}>
          聚会时间助手
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          共享日程 · 灵感发现 · 智能推荐
        </p>
      </div>

      {/* 主卡片 */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
        padding: '32px 28px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-subtle)',
        animation: 'fadeInUp 0.6s var(--ease-out-expo) 0.1s both',
      }}>
        {/* 群名称 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 10,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>📛</span>
            群名称
          </label>
          <input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="比如：铁三角、干饭群..."
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-md)',
              border: '2px solid var(--border-default)', fontSize: 16, outline: 'none',
              boxSizing: 'border-box', background: 'var(--bg-subtle)',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.background = '#fff';
              e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.08)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border-default)';
              e.target.style.background = 'var(--bg-subtle)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* 成员 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 12,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>👥</span>
            成员名字
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((name, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                padding: '6px 16px 6px 6px',
                border: '2px solid var(--border-default)',
                transition: 'all 0.2s',
              }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                  background: `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                  boxShadow: `0 4px 12px ${AVATAR_COLORS[i][0]}30`,
                }}>
                  {AVATAR_EMOJIS[i]}
                </span>
                <input
                  value={name}
                  onChange={e => handleMemberChange(i, e.target.value)}
                  placeholder={`成员 ${i + 1} 的名字`}
                  style={{
                    flex: 1, padding: '8px 4px', border: 'none',
                    fontSize: 15, outline: 'none', background: 'transparent',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            color: '#dc2626', fontSize: 13, marginBottom: 16,
            padding: '12px 16px', background: 'var(--danger-light)',
            borderRadius: 'var(--radius-sm)', display: 'flex',
            alignItems: 'center', gap: 8, fontWeight: 500,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* 创建按钮 */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn-press"
          style={{
            width: '100%', padding: '16px', borderRadius: 'var(--radius-md)',
            background: creating
              ? 'var(--primary-light)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', fontSize: 17, fontWeight: 700,
            cursor: creating ? 'not-allowed' : 'pointer',
            boxShadow: creating ? 'none' : '0 10px 32px rgba(99,102,241,0.35)',
            transition: 'all 0.2s var(--ease-out-expo)',
            letterSpacing: '-0.3px',
          }}
        >
          {creating ? '⏳ 创建中...' : '🚀 创建群组日历'}
        </button>

        <p style={{
          fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
          marginTop: 16, marginBottom: 0,
        }}>
          创建后生成链接，发到微信群即可共用
        </p>
      </div>
    </div>
  );
}
