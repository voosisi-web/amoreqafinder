// login-gate.jsx — ID entry screen

function LoginGate({ approvedIds, onAuthed, fontScale }) {
  const [id, setId] = React.useState('');
  const [err, setErr] = React.useState('');
  const [showRequest, setShowRequest] = React.useState(false);
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    const t = id.trim();
    if (!t) { setErr('ID를 입력해주세요'); setShowRequest(false); return; }
    const found = approvedIds.find(a => a.id.toLowerCase() === t.toLowerCase() && a.active !== false);
    if (found) { onAuthed({ id: found.id, role: found.role === 'admin' ? 'admin' : 'user', name: found.name || '' }); return; }
    setErr('승인되지 않은 ID입니다');
    setShowRequest(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-sans)', padding: 20 }}>
      <div style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 18px', borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--ff-mono)', fontWeight: 700, fontSize: 20 }}>Q</div>
          <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>식품의약품안전처 · 자주하는 질문집</div>
          <h1 style={{ fontSize: 28 * fontScale, fontWeight: 700, letterSpacing: -0.5, margin: 0, color: 'var(--fg)' }}>화장품 Q&amp;A 검색</h1>
          <div style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', marginTop: 8 }}>승인된 ID로 접속해주세요</div>
        </div>
        <form onSubmit={submit} style={{ background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '28px 28px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.04)' }}>
          <label style={{ display: 'block', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>사용자 ID</label>
          <input ref={inputRef} value={id} onChange={(e) => { setId(e.target.value); setErr(''); setShowRequest(false); }} placeholder="ID를 입력하세요"
            style={{ width: '100%', padding: '13px 14px', fontSize: 15 * fontScale, fontFamily: 'var(--ff-sans)', border: '1px solid ' + (err ? '#dc2626' : 'var(--line-strong)'), borderRadius: 8, background: 'var(--bg-input)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box', marginBottom: err ? 8 : 16 }} />
          {err && <div style={{ fontSize: 12 * fontScale, color: '#dc2626', marginBottom: 16 }}>{err}</div>}
          <button type="submit" style={{ width: '100%', padding: '12px', fontSize: 14 * fontScale, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>접속</button>
        </form>

        {showRequest && (
          <div style={{ marginTop: 16, padding: '18px 20px', background: 'var(--accent-bg)', border: '1px solid var(--line-strong)', borderRadius: 12, fontFamily: 'var(--ff-sans)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 * fontScale, fontWeight: 600 }}>i</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5 * fontScale, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>ID 승인 신청이 필요합니다</div>
                <div style={{ fontSize: 12.5 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.7 }}>
                  사전 등록되지 않은 ID입니다. 새로운 ID 승인 신청이 필요하신 경우
                  <strong style={{ color: 'var(--accent)', fontWeight: 600 }}> RA2랩 </strong>으로 문의해 주세요.
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 * fontScale, fontFamily: 'var(--ff-mono)' }}>
                  <div style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--fg-sub)' }}>
                    <span style={{ color: 'var(--muted)', marginRight: 6 }}>문의처</span>
                    <strong style={{ color: 'var(--fg)' }}>RA2랩</strong>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--fg-sub)' }}>
                    <span style={{ color: 'var(--muted)', marginRight: 6 }}>신청 ID</span>
                    <strong style={{ color: 'var(--fg)' }}>{id.trim() || '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }}>승인된 ID · {approvedIds.filter(a => a.active !== false).length}건</div>
      </div>
    </div>
  );
}
window.LoginGate = LoginGate;
