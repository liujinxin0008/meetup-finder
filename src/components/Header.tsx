import { useState } from 'react';

interface HeaderProps {
  groupName: string;
  groupId: string;
  onCopyLink: () => void;
}

export default function Header({ groupName, onCopyLink }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header style={{
      background: 'rgba(250,249,246,0.78)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      color: 'var(--text-primary)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
          boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
        }}>
          🎯
        </div>
        <h1 style={{
          fontSize: 17, fontWeight: 700, margin: 0,
          letterSpacing: '-0.3px', color: 'var(--text-primary)',
        }}>
          {groupName}
        </h1>
      </div>

      <button
        onClick={handleCopy}
        className="btn-press"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
          padding: '8px 16px', borderRadius: 'var(--radius-2xl)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {copied ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            已复制
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            分享链接
          </>
        )}
      </button>
    </header>
  );
}
