import { useState, useMemo } from 'react';
import type { Group, Proposal } from '../types';
import { askAssistant, respondProposal, updateSchedule } from '../api';
import { getWeekDates, toDateKey, toDayName } from '../utils/time';
import { TIME_SLOTS, PRESET_ACTIVITIES, getActivityEmoji } from '../types';

interface Props { group: Group; monday: Date; member: string; proposals: Proposal[]; onProposalsUpdate: (p: Proposal[]) => void; }

const MC = ['#6366f1', '#10b981', '#f59e0b'];

export default function SharedSpace({ group, monday, member, proposals, onProposalsUpdate }: Props) {
  const [aiInput, setAiInput] = useState('');
  const [aiMsgs, setAiMsgs] = useState<{ role: string; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const dates = getWeekDates(monday); const todayKey = toDateKey(new Date()); const nowHour = new Date().getHours(); const members = group.members;
  const getAct = (m: string, dk: string, s: string) => group.schedules[m]?.[dk]?.[s] || '';

  const insights = useMemo(() => {
    const list: { type: string; text: string; color: string }[] = [];
    for (const m of members) { const sched = group.schedules[m]?.[todayKey]; const has = sched && Object.keys(sched).length > 0; const nowS = `${String(nowHour).padStart(2, '0')}:00`; const nowA = has ? sched[nowS] || '' : ''; const ci = members.indexOf(m);
      if (!has) list.push({ type: 'missing', text: `${m} 还没签到`, color: MC[ci] }); else if (nowA) list.push({ type: 'busy', text: `正在${nowA}`, color: MC[ci] }); else list.push({ type: 'free', text: '这会空闲', color: MC[ci] });
    }
    const eveningFree = TIME_SLOTS.filter(s => { const h = parseInt(s); return h >= 18 && h < 22; }).filter(s => members.every(m => !getAct(m, todayKey, s)));
    if (eveningFree.length >= 3) list.push({ type: 'highlight', text: `🌙 今晚 ${eveningFree[0]}-${eveningFree[eveningFree.length - 1]} 三人全空！`, color: '#10b981' });
    return list;
  }, [group.schedules, todayKey, nowHour]);

  const eveningFree = useMemo(() => TIME_SLOTS.filter(s => { const h = parseInt(s); return h >= 18 && h < 22; }).map(slot => ({ slot, free: members.filter(m => !getAct(m, todayKey, slot)), allFree: members.every(m => !getAct(m, todayKey, slot)) })), [group.schedules, todayKey]);

  const handleTeamAsk = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput; setAiInput(''); setAiLoading(true); setAiMsgs(p => [...p, { role: 'user', text: msg }]);
    try {
      let ctx = `${group.name}，${members.join('、')}。当前${nowHour}:00\n`; for (const m of members) { const s = group.schedules[m]?.[todayKey]; ctx += `${m}: ${s && Object.keys(s).length > 0 ? Object.entries(s).filter(([,v])=>v).map(([t,a])=>`${t}${a}`).join(',') : '没签到'}\n`; }
      const result = await askAssistant(group.id, `${ctx}\n问全员：${msg}`);
      setAiMsgs(p => [...p, { role: 'bot', text: result.reply }]);
    } catch (e: any) { setAiMsgs(p => [...p, { role: 'bot', text: '出错了: ' + e.message }]); }
    setAiLoading(false);
  };

  const handleRespond = async (p: Proposal, resp: 'yes' | 'no') => { setResponding(p.id); try { await respondProposal(group.id, p.id, member, resp); if (resp === 'yes') { const ds: Record<string, string> = {}; for (let h = parseInt(p.startSlot); h < parseInt(p.endSlot); h++) ds[`${String(h).padStart(2, '0')}:00`] = p.activity; try { await updateSchedule(group.id, member, p.dateKey, ds); } catch {} } onProposalsUpdate(proposals.map(pp => pp.id === p.id ? { ...pp, responses: { ...pp.responses, [member]: resp } } : pp)); } catch {} setResponding(null); };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      {/* ====== 洞察 20% ====== */}
      <div style={{ width: '20%', minWidth: 150, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>🤖 全员洞察</div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>现在 {String(nowHour).padStart(2, '0')}:00</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {members.map((m, i) => {
            const sched = group.schedules[m]?.[todayKey]; const has = sched && Object.keys(sched).length > 0; const nowS = `${String(nowHour).padStart(2, '0')}:00`; const nowA = has ? sched[nowS] || '' : '';
            return (
              <div key={m} style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 'var(--radius-md)', background: !has ? '#fef3c7' : nowA ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${!has ? '#fde68a' : nowA ? '#fecaca' : '#86efac'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: MC[i], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{m[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m}</div>
                    <div style={{ fontSize: 11, color: !has ? '#92400e' : nowA ? '#991b1b' : '#065f46' }}>
                      {!has ? '❓ 没签到' : nowA ? `🔴 正在${nowA}` : '🟢 空闲中'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>🌙 今晚空闲</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {eveningFree.map(({ slot, free, allFree }) => (
                <div key={slot} style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11, background: allFree ? '#d1fae5' : free.length >= 2 ? '#fef3c7' : '#fee2e2', border: `1px solid ${allFree ? '#86efac' : free.length >= 2 ? '#fde68a' : '#fecaca'}` }}>
                  <b>{slot}</b>
                  <span style={{ marginLeft: 6, color: allFree ? '#065f46' : '#92400e' }}>
                    {allFree ? '🎉 三人全空！' : `${free.join('、')}空闲`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {proposals.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📩 邀约 {proposals.length}</div>
              {proposals.map(p => {
                const isP = p.responses[member] === 'pending' && p.from !== member;
                return (
                  <div key={p.id} style={{ marginBottom: 6, borderRadius: 'var(--radius-md)', border: isP ? '2px solid #f59e0b' : '1px solid var(--border-default)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                    <div style={{ padding: '6px 10px', background: isP ? '#fffbeb' : 'var(--bg-subtle)', fontSize: 11 }}>
                      <b>{p.from}</b> 约 <b>{p.activity}</b>
                      <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{p.dateLabel} {p.startSlot}</div>
                    </div>
                    {isP ? (
                      <div style={{ display: 'flex', gap: 4, padding: '6px 10px' }}>
                        <button onClick={() => handleRespond(p, 'yes')} disabled={responding === p.id} style={{ flex: 1, padding: '5px', borderRadius: 5, border: 'none', background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✅去</button>
                        <button onClick={() => handleRespond(p, 'no')} disabled={responding === p.id} style={{ flex: 1, padding: '5px', borderRadius: 5, border: '1px solid var(--border-default)', background: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>❌没空</button>
                      </div>
                    ) : (
                      <div style={{ padding: '4px 10px', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {Object.entries(p.responses).map(([m, r]) => <span key={m} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: r === 'yes' ? '#d1fae5' : r === 'no' ? '#fee2e2' : '#fef3c7', color: r === 'yes' ? '#065f46' : r === 'no' ? '#991b1b' : '#92400e' }}>{m} {r==='yes'?'✅':r==='no'?'❌':'❓'}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ====== 时间轴 60% ====== */}
      <div style={{ width: '60%', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
        <div style={{ padding: '6px 12px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)', background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          {new Date().getMonth() + 1}/{new Date().getDate()} 三人实时
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {members.map((m, mi) => {
            const sched = group.schedules[m]?.[todayKey]; const has = sched && Object.keys(sched).length > 0; const nowS = `${String(nowHour).padStart(2, '0')}:00`; const nowA = has ? sched[nowS] || '' : '';
            return (
              <div key={m} style={{ marginBottom: 8, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#fff', border: `2px solid ${MC[mi]}15`, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: MC[mi], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{m[0]}</div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{m}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: !has ? '#d4d4d8' : nowA ? '#f59e0b' : '#10b981' }} />
                    {!has ? '未签到' : nowA ? `在${nowA}` : '空闲'}
                  </div>
                </div>
                <div style={{ position: 'relative', height: 20, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                  {has && TIME_SLOTS.filter(s => { const h = parseInt(s); return h >= 6 && h < 24; }).map(slot => { const a = sched[slot]; if (!a) return null; const h = parseInt(slot); const actDef = PRESET_ACTIVITIES.find(x => x.key === a); return <div key={slot} style={{ position: 'absolute', left: `${((h-6)/18)*100}%`, width: `${(1/18)*100}%`, height: '100%', background: actDef?.color || '#e9d5ff', borderRight: '1px solid rgba(0,0,0,0.04)' }} title={`${slot} ${a}`} />; })}
                  <div style={{ position: 'absolute', left: `${((nowHour-6)/18)*100}%`, top: 0, bottom: 0, width: 2, background: '#ef4444', zIndex: 2 }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 1, minWidth: 350, fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2 }}><div style={{ width: 28 }}/>{dates.map(d => <div key={toDateKey(d)} style={{ flex: 1, textAlign: 'center' }}>{toDayName(d)}</div>)}</div>
            {TIME_SLOTS.filter(s => { const h = parseInt(s); return h >= 8 && h < 22; }).map(slot => (
              <div key={slot} style={{ display: 'flex', gap: 1, alignItems: 'center', minHeight: 16 }}>
                <div style={{ width: 28, fontSize: 8, color: 'var(--text-tertiary)', textAlign: 'right', paddingRight: 3 }}>{slot}</div>
                {dates.map(d => { const dk = toDateKey(d); const acts = members.map(m => getAct(m, dk, slot)); const fc = acts.filter(a => !a).length;
                  return <div key={dk} style={{ flex: 1, height: 16, borderRadius: 2, background: fc === 3 ? '#d1fae5' : fc === 2 ? '#fef3c7' : fc === 1 ? '#fed7aa' : '#fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>{acts.filter(Boolean).map((a, i) => <span key={i} style={{ fontSize: 8 }}>{getActivityEmoji(a)}</span>)}{fc === 3 && <span style={{ fontSize: 7, color: '#065f46' }}>全空</span>}</div>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== AI 20% ====== */}
      <div style={{ width: '20%', minWidth: 160, borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden', paddingBottom: 50 }}>
        <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderBottom: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>🤖 聚会军师</div>
          <div style={{ fontSize: 10, color: '#059669', opacity: 0.7 }}>帮你们约时间出主意</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {aiMsgs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>问我：<br/>"这周哪天都有空？"<br/>"推荐个活动"</div>
          )}
          {aiMsgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ padding: '8px 12px', borderRadius: m.role === 'user' ? 'var(--radius-md) 4px var(--radius-md) var(--radius-md)' : '4px var(--radius-md) var(--radius-md) var(--radius-md)', background: m.role === 'user' ? 'linear-gradient(135deg, #10b981, #34d399)' : 'var(--bg-subtle)', color: m.role === 'user' ? '#fff' : 'var(--text-primary)', fontSize: 12, lineHeight: 1.5, maxWidth: '100%', whiteSpace: 'pre-line' }}>{m.text}</div>
            </div>
          ))}
          {aiLoading && <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: 4 }}><span>🤖</span>{[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#a7f3d0', animation: `pulse 1s infinite ${i*0.2}s` }}/>)}</div>}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 4 }}>
          <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleTeamAsk(); }} placeholder="问大家..." style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border-default)', fontSize: 12, outline: 'none', background: 'var(--bg-subtle)' }} />
          <button onClick={handleTeamAsk} disabled={aiLoading || !aiInput.trim()} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: aiInput.trim() ? '#10b981' : 'var(--border-default)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: aiInput.trim() ? 'pointer' : 'not-allowed' }}>发送</button>
        </div>
      </div>
    </div>
  );
}
