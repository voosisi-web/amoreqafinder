// admin-panel.jsx — Admin console
// Changes: + 서버 저장소 tab, + category in QAEditor/QAManager, + ID Excel→JSON prompt

// ─────────────────────────────────────────────────────────────
// Netlify Function helpers — JSONBin proxy (API key is kept on server)
// ─────────────────────────────────────────────────────────────
async function proxyCall(payload) {
  const r = await fetch('/.netlify/functions/jsonbin-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  let j = null;
  try { j = await r.json(); } catch {}
  if (!r.ok || !j?.ok) throw new Error(j?.error || `서버 오류 ${r.status}`);
  return j;
}

async function jsonbinFetch(binId, type = 'qa') {
  const j = await proxyCall({ action: 'read', binId, type });
  return j.record;
}

async function jsonbinPut(binId, data, type = 'qa') {
  const j = await proxyCall({ action: 'write', binId, data, type });
  return j;
}

async function jsonbinCreate(name, data, type = 'qa') {
  const j = await proxyCall({ action: 'create', name, data, type });
  return j.binId;
}

const SERVER_CONFIG_KEY = 'qa-server-config';
function getStoredServerConfig() {
  try { return JSON.parse(localStorage.getItem(SERVER_CONFIG_KEY) || 'null'); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────
// AdminPanel
// ─────────────────────────────────────────────────────────────
function AdminPanel({ approvedIds, setApprovedIds, data, setData, onExit, onLogout, fontScale }) {
  const [tab, setTab] = React.useState('ids');
  const TABS = [
    { k: 'ids',     label: '승인 ID 관리', count: approvedIds.length },
    { k: 'qa',      label: 'Q&A 관리', count: data.length },
    { k: 'import',  label: '가져오기 / 내보내기' },
    { k: 'server',  label: '서버 저장소' },
    { k: 'convert', label: '업로드 양식 다운로드' },
    { k: 'deploy',  label: '배포 / 공유' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--ff-sans)', fontSize: 14 * fontScale }}>
      <div style={{ borderBottom: '1px solid var(--line)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '2px 8px', background: 'var(--accent)', color: '#fff', fontSize: 10 * fontScale, fontFamily: 'var(--ff-mono)', borderRadius: 3, fontWeight: 600, letterSpacing: 0.5 }}>ADMIN</div>
        <div style={{ fontSize: 15 * fontScale, fontWeight: 600 }}>관리자 콘솔</div>
        <div style={{ flex: 1 }} />
        <button onClick={onExit} style={{ padding: '6px 12px', fontSize: 12 * fontScale, background: 'var(--bg-sub)', border: '1px solid var(--line-strong)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg-sub)' }}>← 검색 페이지로</button>
        <button onClick={onLogout} style={{ padding: '6px 12px', fontSize: 12 * fontScale, background: 'var(--bg-sub)', border: '1px solid var(--line-strong)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg-sub)' }}>로그아웃</button>
      </div>
      <div style={{ borderBottom: '1px solid var(--line)', padding: '0 28px', display: 'flex', background: 'var(--bg)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: '14px 18px', background: 'transparent', border: 'none', borderBottom: tab === t.k ? '2px solid var(--accent)' : '2px solid transparent', color: tab === t.k ? 'var(--fg)' : 'var(--fg-sub)', fontWeight: tab === t.k ? 600 : 400, cursor: 'pointer', fontSize: 13 * fontScale, whiteSpace: 'nowrap' }}>
            {t.label}{t.count != null && <span style={{ marginLeft: 6, fontFamily: 'var(--ff-mono)', fontSize: 11 * fontScale, color: 'var(--muted)' }}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 28px 80px' }}>
        {tab === 'ids'     && <IdManager approvedIds={approvedIds} setApprovedIds={setApprovedIds} fontScale={fontScale} />}
        {tab === 'qa'      && <QAManager data={data} setData={setData} fontScale={fontScale} />}
        {tab === 'import'  && <ImportExport data={data} setData={setData} approvedIds={approvedIds} setApprovedIds={setApprovedIds} fontScale={fontScale} />}
        {tab === 'server'  && <ServerStorageTab data={data} setData={setData} approvedIds={approvedIds} setApprovedIds={setApprovedIds} fontScale={fontScale} />}
        {tab === 'convert' && <ConvertPromptTab fontScale={fontScale} />}
        {tab === 'deploy'  && <DeployGuide fontScale={fontScale} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IdManager
// ─────────────────────────────────────────────────────────────
function IdManager({ approvedIds, setApprovedIds, fontScale }) {
  const [newId, setNewId] = React.useState(''); const [newName, setNewName] = React.useState('');
  const [newRole, setNewRole] = React.useState('user');
  const [query, setQuery] = React.useState(''); const [err, setErr] = React.useState('');
  const PROTECTED = 'AP35000725';
  const add = () => {
    const id = newId.trim();
    if (!id) { setErr('ID를 입력하세요'); return; }
    if (id.toLowerCase() === PROTECTED.toLowerCase()) { setErr('예약된 시스템 관리자 ID 입니다'); return; }
    if (approvedIds.find(a => a.id.toLowerCase() === id.toLowerCase())) { setErr('이미 등록된 ID입니다'); return; }
    setApprovedIds([...approvedIds, { id, name: newName.trim(), addedAt: new Date().toISOString().slice(0,10), active: true, role: newRole }]);
    setNewId(''); setNewName(''); setNewRole('user'); setErr('');
  };
  const remove = (id) => {
    if (id === PROTECTED) { alert('시스템 관리자 ID는 삭제할 수 없습니다'); return; }
    if (confirm(`"${id}" ID를 삭제하시겠습니까?`)) setApprovedIds(approvedIds.filter(a => a.id !== id));
  };
  const toggleActive = (id) => {
    if (id === PROTECTED) { alert('시스템 관리자 ID는 비활성화할 수 없습니다'); return; }
    setApprovedIds(approvedIds.map(a => a.id === id ? { ...a, active: a.active === false ? true : false } : a));
  };
  const toggleRole = (id) => {
    if (id === PROTECTED) { alert('시스템 관리자 ID의 권한은 변경할 수 없습니다'); return; }
    setApprovedIds(approvedIds.map(a => a.id === id ? { ...a, role: a.role === 'admin' ? 'user' : 'admin' } : a));
  };
  const filtered = approvedIds.filter(a => !query || a.id.toLowerCase().includes(query.toLowerCase()) || (a.name || '').toLowerCase().includes(query.toLowerCase()));
  const adminCount = approvedIds.filter(a => a.role === 'admin').length;
  const userCount = approvedIds.filter(a => a.role !== 'admin').length;
  const roleBadge = (role) => role === 'admin' ? { bg: 'var(--accent)', fg: '#fff', label: '관리자' } : { bg: 'var(--bg-sub)', fg: 'var(--fg-sub)', label: '사용자' };

  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>승인 ID 관리</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 16px' }}>승인된 ID만 Q&amp;A 검색 페이지에 접속할 수 있습니다. 관리자 권한을 부여하면 이 관리자 콘솔에도 접근 가능합니다.</p>
      <div style={{ display: 'flex', gap: 18, marginBottom: 20, fontSize: 12 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)' }}>
        <div>전체 <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{approvedIds.length}</strong></div>
        <div>관리자 <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{adminCount}</strong></div>
        <div>사용자 <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{userCount}</strong></div>
      </div>
      <div style={{ background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 10, padding: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>새 ID 추가</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <input value={newId} onChange={(e) => { setNewId(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="사용자 ID" style={inp(fontScale, { flex: '1 1 160px' })} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="이름 또는 설명 (선택)" style={inp(fontScale, { flex: '1 1 180px' })} />
          <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 7, flex: '0 0 auto' }}>
            <button onClick={() => setNewRole('user')} style={segB(newRole === 'user', fontScale, { padding: '6px 14px' })}>사용자</button>
            <button onClick={() => setNewRole('admin')} style={segB(newRole === 'admin', fontScale, { padding: '6px 14px' })}>관리자</button>
          </div>
          <button onClick={add} style={{ padding: '10px 20px', fontSize: 13 * fontScale, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>추가</button>
        </div>
        {err && <div style={{ fontSize: 12 * fontScale, color: '#dc2626', marginTop: 8 }}>{err}</div>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ID 또는 이름 검색…" style={inp(fontScale, { width: '100%' })} />
      </div>
      <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 0.9fr 0.9fr 0.7fr 70px', padding: '10px 16px', background: 'var(--bg-sub)', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--line)' }}>
          <div>ID</div><div>이름/설명</div><div>권한</div><div>등록일</div><div>상태</div><div></div>
        </div>
        {filtered.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 * fontScale }}>{query ? '검색 결과 없음' : '등록된 ID가 없습니다'}</div> :
          filtered.map(a => {
            const b = roleBadge(a.role);
            const isProtected = a.id === PROTECTED;
            return (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 0.9fr 0.9fr 0.7fr 70px', padding: '12px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 13 * fontScale, opacity: a.active === false ? 0.55 : 1, background: a.role === 'admin' ? 'linear-gradient(90deg, var(--accent-bg) 0%, transparent 40%)' : 'transparent' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>{a.id}{isProtected && <span title="시스템 관리자 (변경 불가)" style={{ fontSize: 10 * fontScale, color: 'var(--muted)' }}>🔒</span>}</div>
                <div style={{ color: 'var(--fg-sub)' }}>{a.name || <span style={{ color: 'var(--muted)' }}>—</span>}</div>
                <div><button onClick={() => toggleRole(a.id)} disabled={isProtected} style={{ padding: '3px 10px', fontSize: 11 * fontScale, borderRadius: 4, border: 'none', background: b.bg, color: b.fg, cursor: isProtected ? 'not-allowed' : 'pointer', fontFamily: 'var(--ff-mono)', fontWeight: 600, letterSpacing: 0.3 }}>{b.label}</button></div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 * fontScale, color: 'var(--muted)' }}>{a.addedAt || '—'}</div>
                <div><button onClick={() => toggleActive(a.id)} disabled={isProtected} style={{ padding: '3px 9px', fontSize: 11 * fontScale, borderRadius: 4, border: '1px solid ' + (a.active === false ? 'var(--line-strong)' : '#10b98133'), background: a.active === false ? 'var(--bg-sub)' : '#10b98118', color: a.active === false ? 'var(--muted)' : '#059669', cursor: isProtected ? 'not-allowed' : 'pointer', fontFamily: 'var(--ff-mono)' }}>{a.active === false ? '비활성' : '활성'}</button></div>
                <div style={{ textAlign: 'right' }}>{!isProtected && <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 * fontScale, padding: 4 }}>삭제</button>}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QAManager
// ─────────────────────────────────────────────────────────────
function QAManager({ data, setData, fontScale }) {
  const [editing, setEditing] = React.useState(null); const [query, setQuery] = React.useState('');
  const blank = () => ({ id: Math.max(0, ...data.map(d => d.id)) + 1, qnum: '', chapter: '', section: '', title: '', question: '', answer: '', source: '', sourceFile: '사용자 추가', docNum: '', date: new Date().toISOString().slice(0,10).replace(/-/g,'.'), year: new Date().getFullYear(), functional: false, category: '화장품' });
  const save = (item) => {
    if (!item.title.trim() || !item.question.trim()) { alert('제목과 질문은 필수입니다'); return; }
    const exists = data.find(d => d.id === item.id);
    if (exists) setData(data.map(d => d.id === item.id ? item : d)); else setData([...data, item]);
    setEditing(null);
  };
  const remove = (id) => { if (confirm('이 Q&A를 삭제하시겠습니까?')) setData(data.filter(d => d.id !== id)); };
  const filtered = data.filter(d => !query || (d.title || '').toLowerCase().includes(query.toLowerCase()) || (d.qnum || '').toLowerCase().includes(query.toLowerCase()) || (d.question || '').toLowerCase().includes(query.toLowerCase())).slice(0, 100);
  if (editing) return <QAEditor item={editing} onSave={save} onCancel={() => setEditing(null)} fontScale={fontScale} />;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div><h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>Q&A 관리</h2><p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: 0 }}>자주하는 질문집을 수동으로 추가/수정/삭제합니다.</p></div>
        <button onClick={() => setEditing(blank())} style={{ padding: '10px 16px', fontSize: 13 * fontScale, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>+ 새 Q&amp;A 추가</button>
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목, 질문번호, 질문 내용 검색…" style={inp(fontScale, { width: '100%', marginTop: 20, marginBottom: 14 })} />
      <div style={{ fontSize: 12 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)', marginBottom: 10 }}>{query ? `${filtered.length} / ${data.length}건` : `전체 ${data.length}건 (최대 100건 표시)`}</div>
      <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
        {filtered.map(item => (
          <div key={item.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', marginBottom: 4 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{item.qnum}</span><span>·</span><span>{item.sourceFile}</span>
                {item.chapter && <><span>·</span><span>{item.chapter}</span></>}
                {item.category && item.category !== '화장품' && <span style={{ padding: '1px 6px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 4, color: 'var(--accent)' }}>{item.category}</span>}
              </div>
              <div style={{ fontSize: 14 * fontScale, fontWeight: 500, marginBottom: 4 }}>{item.title || '(제목 없음)'}</div>
              <div style={{ fontSize: 12 * fontScale, color: 'var(--fg-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(item.question || '').slice(0, 140)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setEditing({ ...item })} style={sBtn(fontScale)}>수정</button>
              <button onClick={() => remove(item.id)} style={{ ...sBtn(fontScale), color: '#dc2626' }}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QAEditor — now includes category dropdown
// ─────────────────────────────────────────────────────────────
function QAEditor({ item, onSave, onCancel, fontScale }) {
  const [form, setForm] = React.useState(item);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const f = (label, key, multi) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</label>
      {multi ? <textarea value={form[key] || ''} onChange={(e) => set(key, e.target.value)} rows={multi} style={inp(fontScale, { width: '100%', resize: 'vertical', lineHeight: 1.6 })} /> :
        <input value={form[key] || ''} onChange={(e) => set(key, e.target.value)} style={inp(fontScale, { width: '100%' })} />}
    </div>
  );
  return (
    <div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--fg-sub)', fontSize: 13 * fontScale, cursor: 'pointer', padding: 0, marginBottom: 16 }}>← 목록으로</button>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 24px', fontWeight: 600 }}>{item.qnum ? `[${item.qnum}] 수정` : '새 Q&A 추가'}</h2>

      {/* Category selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>카테고리 (유형)</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(window.CATEGORIES || [
            { id: '화장품', label: '화장품', emoji: '🧴' },
            { id: '건강기능식품', label: '건강기능식품/식품', emoji: '🌿' },
            { id: '의약외품', label: '의약외품', emoji: '🩹' },
            { id: '의료기기', label: '의료기기', emoji: '🏥' },
          ]).map(cat => (
            <button key={cat.id} type="button" onClick={() => set('category', cat.id)}
              style={{ padding: '7px 14px', fontSize: 13 * fontScale, border: '1px solid ' + ((form.category || '화장품') === cat.id ? 'var(--accent)' : 'var(--line-strong)'), borderRadius: 7, background: (form.category || '화장품') === cat.id ? 'var(--accent-bg)' : 'var(--bg)', color: (form.category || '화장품') === cat.id ? 'var(--accent)' : 'var(--fg-sub)', cursor: 'pointer', fontWeight: (form.category || '화장품') === cat.id ? 600 : 400 }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>{f('질문번호', 'qnum')}</div><div>{f('제목', 'title')}</div>
        <div>{f('장(章)', 'chapter')}</div><div>{f('절(節)', 'section')}</div>
        <div>{f('출처/파일명', 'sourceFile')}</div><div>{f('문서번호', 'docNum')}</div>
        <div>{f('발행일', 'date')}</div><div>{f('연도', 'year')}</div>
      </div>
      {f('질문', 'question', 4)}{f('답변', 'answer', 10)}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button onClick={() => onSave(form)} style={{ padding: '11px 22px', fontSize: 13 * fontScale, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>저장</button>
        <button onClick={onCancel} style={{ padding: '11px 22px', fontSize: 13 * fontScale, background: 'var(--bg-sub)', color: 'var(--fg)', border: '1px solid var(--line-strong)', borderRadius: 7, cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ImportExport
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Excel 파싱 헬퍼 — SheetJS(XLSX) 사용
// ─────────────────────────────────────────────────────────────

// Q&A 엑셀 컬럼명 → JSON 필드명 매핑 (한/영 모두 지원)
const QA_COL_MAP = {
  // qnum
  'qnum': 'qnum', '번호': 'qnum', '질문번호': 'qnum', 'q번호': 'qnum', 'no': 'qnum', '순번': 'qnum',
  // title
  'title': 'title', '제목': 'title', '질문제목': 'title', '소제목': 'title',
  // question
  'question': 'question', '질문': 'question', 'q': 'question', '문의내용': 'question', '내용': 'question',
  // answer
  'answer': 'answer', '답변': 'answer', 'a': 'answer', '회답': 'answer', '답': 'answer',
  // sourceFile
  'sourcefile': 'sourceFile', '출처': 'sourceFile', '자료명': 'sourceFile', '파일명': 'sourceFile',
  '자료출처': 'sourceFile', '간행물': 'sourceFile', '출처명': 'sourceFile',
  // chapter
  'chapter': 'chapter', '장': 'chapter', '장(장)': 'chapter', '챕터': 'chapter',
  // section
  'section': 'section', '절': 'section', '절(절)': 'section',
  // docNum
  'docnum': 'docNum', '문서번호': 'docNum', '문서': 'docNum',
  // date
  'date': 'date', '발행일': 'date', '날짜': 'date', '일자': 'date', '게시일': 'date',
  // year
  'year': 'year', '연도': 'year', '년도': 'year', '년': 'year',
  // category
  'category': 'category', '카테고리': 'category', '유형': 'category', '분류': 'category', '품목': 'category',
  // functional
  'functional': 'functional', '기능성': 'functional',
};

// ID 엑셀 컬럼명 → JSON 필드명 매핑
const ID_COL_MAP = {
  'id': 'id', 'ID': 'id', '승인id': 'id', '승인 ID': 'id', '승인아이디': 'id', '아이디': 'id', '사용자id': 'id', '사용자 id': 'id',
  'name': 'name', '이름': 'name', '성명': 'name', '담당자': 'name', '사용자명': 'name',
  'role': 'role', '역할': 'role', '권한': 'role', '권한명': 'role',
  'active': 'active', '활성': 'active', '사용': 'active', '활성여부': 'active', '사용여부': 'active',
  'addedat': 'addedAt', '등록일': 'addedAt', '추가일': 'addedAt', '날짜': 'addedAt',
};

function xlsxRowToQA(row, index, maxId) {
  const obj = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim().toLowerCase().replace(/\s+/g, '');
    const field = QA_COL_MAP[key] || QA_COL_MAP[k.trim()];
    if (field && String(v).trim()) obj[field] = String(v).trim();
  }
  if (!obj.question && !obj.title && !obj.qnum) return null;
  // ID 자동 부여
  obj.id = maxId + index + 1;
  // 연도 숫자로
  if (obj.year) obj.year = parseInt(obj.year) || new Date().getFullYear();
  // functional 불리언
  if (obj.functional !== undefined) obj.functional = obj.functional === 'true' || obj.functional === '1' || obj.functional === 'Y';
  // 기본값
  if (!obj.sourceFile) obj.sourceFile = '사용자 추가';
  return obj;
}

function xlsxRowToID(row) {
  const obj = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim().toLowerCase().replace(/\s+/g, '');
    const field = ID_COL_MAP[key] || ID_COL_MAP[k.trim()];
    if (field) obj[field] = String(v).trim();
  }
  if (!obj.id) return null;
  obj.id = obj.id.replace(/\s+/g, ''); // ID 공백 제거
  // role 정규화
  const roleVal = (obj.role || '').toLowerCase();
  obj.role = (roleVal === 'admin' || roleVal === '관리자') ? 'admin' : 'user';
  // active 불리언
  const activeVal = (obj.active || 'true').toLowerCase();
  obj.active = !(activeVal === 'false' || activeVal === '비활성' || activeVal === 'n' || activeVal === '0');
  if (!obj.addedAt) obj.addedAt = new Date().toISOString().slice(0, 10);
  if (!obj.name) obj.name = '';
  return obj;
}

async function parseExcelFile(file) {
  if (!window.XLSX) throw new Error('엑셀 파서 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해 주세요.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = window.XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

function exportQAToXlsx(items, filename = `qa-export-${Date.now()}.xlsx`) {
  if (!window.XLSX) throw new Error('엑셀 파서 라이브러리가 로드되지 않았습니다.');
  const rows = (items || []).map(it => ({
    '질문번호': it.qnum || '',
    '장': it.chapter || '',
    '절': it.section || '',
    '제목(키워드)': it.title || '',
    '질문(원문)': it.question || '',
    '답변(원문)': it.answer || '',
    '출처': it.sourceFile || it.source || '',
    '문서번호': it.docNum || '',
    '발행일': it.date || it.year || '',
  }));
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.json_to_sheet(rows, { header: ['질문번호','장','절','제목(키워드)','질문(원문)','답변(원문)','출처','문서번호','발행일'] });
  window.XLSX.utils.book_append_sheet(wb, ws, 'QnA');
  window.XLSX.writeFile(wb, filename);
}

function exportIdsToXlsx(items, filename = `ids-export-${Date.now()}.xlsx`) {
  if (!window.XLSX) throw new Error('엑셀 파서 라이브러리가 로드되지 않았습니다.');
  const rows = (items || []).map(it => ({
    '승인ID': it.id || '',
    '이름': it.name || '',
    '역할': it.role || 'user',
    '활성여부': it.active === false ? 'false' : 'true',
    '등록일': it.addedAt || '',
  }));
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.json_to_sheet(rows, { header: ['승인ID','이름','역할','활성여부','등록일'] });
  window.XLSX.utils.book_append_sheet(wb, ws, 'IDs');
  window.XLSX.writeFile(wb, filename);
}

async function resolveServerBins() {
  const localCfg = getStoredServerConfig() || {};
  let envCfg = {};
  try {
    const j = await proxyCall({ action: 'get-config' });
    envCfg = j?.config || {};
  } catch {}
  return {
    qaBinId: localCfg.qaBinId || envCfg.qaBinId || '',
    idsBinId: localCfg.idsBinId || envCfg.idsBinId || '',
  };
}

async function autoSyncToServer(nextQa, nextIds) {
  const cfg = await resolveServerBins();
  const jobs = [];
  if (cfg.qaBinId) jobs.push(jsonbinPut(cfg.qaBinId, nextQa, 'qa'));
  if (cfg.idsBinId) jobs.push(jsonbinPut(cfg.idsBinId, nextIds, 'ids'));
  if (!jobs.length) return { synced: false };
  await Promise.all(jobs);
  return { synced: true };
}

// ─────────────────────────────────────────────────────────────
// ImportExport — JSON & 엑셀 가져오기/내보내기
// ─────────────────────────────────────────────────────────────
function ImportExport({ data, setData, approvedIds, setApprovedIds, fontScale }) {
  const [mode, setMode] = React.useState('append');
  const [msg, setMsg] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const qXlsxRef = React.useRef(null);
  const iXlsxRef = React.useRef(null);
  const xlsxAvailable = !!window.XLSX;

  const setDone = (text, isError = false) => setMsg((isError ? '❌ ' : '✅ ') + text);

  const impQAXlsx = async (file) => {
    setIsLoading(true); setMsg('엑셀 파일 읽는 중…');
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) throw new Error('데이터가 없습니다.');
      const maxId = mode === 'replace' ? 0 : Math.max(0, ...data.map(d => d.id || 0));
      const items = rows.map((r, i) => xlsxRowToQA(r, i, maxId)).filter(Boolean);
      if (!items.length) throw new Error('인식된 Q&A 행이 없습니다. 양식 헤더를 확인해 주세요.');
      const nextQa = mode === 'replace' ? items : [...data, ...items];
      setData(nextQa);
      const sync = await autoSyncToServer(nextQa, approvedIds);
      setDone(sync.synced ? `Q&A ${items.length}건 업로드 완료 · 서버 자동 저장 완료` : `Q&A ${items.length}건 업로드 완료 · 서버 Bin 미설정으로 로컬에만 반영됨`);
    } catch (e) {
      setDone(e.message || '업로드 실패', true);
    } finally {
      if (qXlsxRef.current) qXlsxRef.current.value = '';
      setIsLoading(false);
    }
  };

  const impIdXlsx = async (file) => {
    setIsLoading(true); setMsg('엑셀 파일 읽는 중…');
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) throw new Error('데이터가 없습니다.');
      const items = rows.map(xlsxRowToID).filter(Boolean);
      if (!items.length) throw new Error('인식된 승인 ID 행이 없습니다. "승인ID" 또는 "ID" 헤더를 확인해 주세요.');
      setApprovedIds(items);
      const sync = await autoSyncToServer(data, items);
      setDone(sync.synced ? `승인 ID ${items.length}건 업로드 완료 · 서버 자동 저장 완료` : `승인 ID ${items.length}건 업로드 완료 · 서버 Bin 미설정으로 로컬에만 반영됨`);
    } catch (e) {
      setDone(e.message || '업로드 실패', true);
    } finally {
      if (iXlsxRef.current) iXlsxRef.current.value = '';
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>가져오기 / 내보내기</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 8px' }}>
        <strong>엑셀(.xlsx)</strong> 파일만 업로드할 수 있습니다. 업로드가 끝나면 서버 저장소가 연결된 경우 자동으로 서버에도 반영됩니다.
      </p>

      <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--accent-bg)', border: '1px solid var(--line-strong)', borderRadius: 8, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--accent)' }}>📋 업로드 양식 헤더</strong>
        <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div><strong style={{ color: 'var(--fg)' }}>Q&A 엑셀</strong><br />
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 * fontScale }}>
              질문번호 · 장 · 절 · 제목(키워드) · 질문(원문) · 답변(원문) · 출처 · 문서번호 · 발행일
            </span>
          </div>
          <div><strong style={{ color: 'var(--fg)' }}>승인 ID 엑셀</strong><br />
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 * fontScale }}>
              승인ID · 이름 · 역할 · 활성여부 · 등록일
            </span>
          </div>
        </div>
      </div>

      {!xlsxAvailable && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12 * fontScale, color: '#dc2626' }}>
          ⚠️ 엑셀 파서 라이브러리가 로드되지 않았습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해 주세요.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 20, background: 'var(--bg-sub)' }}>
          <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Q&A 데이터 ({data.length}건)
          </div>
          <div style={{ fontSize: 11 * fontScale, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--ff-mono)', textTransform: 'uppercase', letterSpacing: 0.6 }}>가져오기 모드</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, padding: 3, background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 6 }}>
            <button onClick={() => setMode('append')} style={segB(mode === 'append', fontScale)}>추가</button>
            <button onClick={() => setMode('replace')} style={segB(mode === 'replace', fontScale)}>전체 교체</button>
          </div>
          <input ref={qXlsxRef} type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && impQAXlsx(e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => qXlsxRef.current?.click()} disabled={!xlsxAvailable || isLoading}
            style={{ ...sBtn2(fontScale), width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)', opacity: (!xlsxAvailable || isLoading) ? 0.5 : 1, cursor: (!xlsxAvailable || isLoading) ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
            📊 Q&A 엑셀(.xlsx) 업로드
          </button>
          <button onClick={() => exportQAToXlsx(data)} disabled={!xlsxAvailable || isLoading} style={{ ...pBtn(fontScale), width: '100%', opacity: (!xlsxAvailable || isLoading) ? 0.5 : 1 }}>
            ⬇ Q&A 엑셀로 내보내기
          </button>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 20, background: 'var(--bg-sub)' }}>
          <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            승인 ID ({approvedIds.length}건) — 항상 전체 교체
          </div>
          <input ref={iXlsxRef} type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && impIdXlsx(e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => iXlsxRef.current?.click()} disabled={!xlsxAvailable || isLoading}
            style={{ ...sBtn2(fontScale), width: '100%', borderColor: '#059669', color: '#059669', opacity: (!xlsxAvailable || isLoading) ? 0.5 : 1, cursor: (!xlsxAvailable || isLoading) ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
            📊 승인 ID 엑셀(.xlsx) 업로드
          </button>
          <button onClick={() => exportIdsToXlsx(approvedIds)} disabled={!xlsxAvailable || isLoading} style={{ ...pBtn(fontScale), width: '100%', background: '#059669', opacity: (!xlsxAvailable || isLoading) ? 0.5 : 1 }}>
            ⬇ 승인 ID 엑셀로 내보내기
          </button>
          <div style={{ marginTop: 12, fontSize: 11 * fontScale, color: 'var(--muted)', lineHeight: 1.6 }}>
            업로드가 끝나면 연결된 서버 저장소에 자동으로 저장됩니다.
          </div>
        </div>
      </div>

      {isLoading && <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-sub)', fontSize: 12.5 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }}>처리 중…</div>}
      {msg && !isLoading && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: msg.startsWith('❌') ? '#fef2f2' : 'var(--accent-bg)', color: msg.startsWith('❌') ? '#dc2626' : 'var(--accent)', fontSize: 12.5 * fontScale, fontFamily: 'var(--ff-mono)', whiteSpace: 'pre-line' }}>
          {msg}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// ServerStorageTab — JSONBin.io 기반 서버 저장소
// ─────────────────────────────────────────────────────────────
function ServerStorageTab({ data, setData, approvedIds, setApprovedIds, fontScale }) {
  const [config, setConfig] = React.useState(() => getStoredServerConfig() || { qaBinId: '', idsBinId: '' });
  const [status, setStatus] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    proxyCall({ action: 'get-config' }).then((j) => {
      if (!alive) return;
      const cfg = j?.config || {};
      if (!cfg.qaBinId && !cfg.idsBinId) return;
      setConfig((prev) => ({
        qaBinId: prev.qaBinId || cfg.qaBinId || '',
        idsBinId: prev.idsBinId || cfg.idsBinId || '',
      }));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const saveConfig = () => {
    localStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
    setIsDirty(false);
    setStatus('✅ Bin ID 설정이 이 브라우저에 저장되었습니다. 모든 사용자 자동 반영은 Netlify 환경변수(JSONBIN_QA_BIN_ID / JSONBIN_IDS_BIN_ID)도 함께 설정해야 합니다.');
  };

  const clearConfig = () => {
    if (!confirm('서버 저장소 설정을 삭제하시겠습니까? 로컬 데이터는 유지됩니다.')) return;
    localStorage.removeItem(SERVER_CONFIG_KEY);
    setConfig({ qaBinId: '', idsBinId: '' });
    setStatus('설정이 삭제되었습니다.');
    setIsDirty(false);
  };

  const testConnection = async () => {
    if (!config.qaBinId) { setStatus('❌ Q&A Bin ID를 입력하세요.'); return; }
    setIsLoading(true); setStatus('연결 테스트 중…');
    try {
      const d = await jsonbinFetch(config.qaBinId, 'qa');
      const qa = Array.isArray(d) ? d : (Array.isArray(d?.qa) ? d.qa : (Array.isArray(d?.data) ? d.data : null));
      setStatus(`✅ 연결 성공! Q&A Bin에서 ${Array.isArray(qa) ? qa.length + '건' : '데이터'}을 확인했습니다.`);
    } catch (e) { setStatus('❌ 연결 실패: ' + e.message); }
    setIsLoading(false);
  };

  const createBins = async () => {
    setIsLoading(true); setStatus('Bin 생성 중…');
    try {
      const qId = await jsonbinCreate('qa-data', data, 'qa');
      const iId = await jsonbinCreate('ids-data', approvedIds, 'ids');
      const newCfg = { ...config, qaBinId: qId, idsBinId: iId };
      setConfig(newCfg);
      localStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(newCfg));
      setIsDirty(false);
      setStatus(`✅ Bin 생성 완료! Q&A Bin: ${qId} / ID Bin: ${iId}
현재 데이터(Q&A ${data.length}건, ID ${approvedIds.length}건)를 초기 업로드했습니다.`);
    } catch (e) { setStatus('❌ 생성 실패: ' + e.message); }
    setIsLoading(false);
  };

  const pullFromServer = async () => {
    if (!config.qaBinId) { setStatus('❌ Q&A Bin ID가 필요합니다.'); return; }
    if (!confirm('서버에서 데이터를 가져오면 현재 로컬 데이터가 덮어쓰입니다. 계속하시겠습니까?')) return;
    setIsLoading(true); setStatus('서버에서 가져오는 중…');
    try {
      const msgs = [];
      if (config.qaBinId) {
        const qaRes = await jsonbinFetch(config.qaBinId, 'qa');
        const qa = Array.isArray(qaRes) ? qaRes : (Array.isArray(qaRes?.qa) ? qaRes.qa : (Array.isArray(qaRes?.data) ? qaRes.data : null));
        if (Array.isArray(qa)) { setData(qa); msgs.push(`Q&A ${qa.length}건`); }
      }
      if (config.idsBinId) {
        const idsRes = await jsonbinFetch(config.idsBinId, 'ids');
        const ids = Array.isArray(idsRes) ? idsRes : (Array.isArray(idsRes?.ids) ? idsRes.ids : (Array.isArray(idsRes?.data) ? idsRes.data : null));
        if (Array.isArray(ids)) { setApprovedIds(ids); msgs.push(`승인 ID ${ids.length}건`); }
      }
      setStatus(`✅ 가져오기 완료: ${msgs.join(', ')}`);
    } catch (e) { setStatus('❌ 가져오기 실패: ' + e.message); }
    setIsLoading(false);
  };

  const pushToServer = async () => {
    if (!config.qaBinId) { setStatus('❌ Q&A Bin ID가 필요합니다.'); return; }
    if (!confirm(`현재 로컬 데이터(Q&A ${data.length}건, ID ${approvedIds.length}건)를 서버에 업로드합니다. 계속하시겠습니까?`)) return;
    setIsLoading(true); setStatus('서버에 업로드 중…');
    try {
      const msgs = [];
      if (config.qaBinId) { await jsonbinPut(config.qaBinId, data, 'qa'); msgs.push(`Q&A ${data.length}건`); }
      if (config.idsBinId) { await jsonbinPut(config.idsBinId, approvedIds, 'ids'); msgs.push(`ID ${approvedIds.length}건`); }
      setStatus(`✅ 업로드 완료: ${msgs.join(', ')}`);
    } catch (e) { setStatus('❌ 업로드 실패: ' + e.message); }
    setIsLoading(false);
  };

  const deleteServerQA = async () => {
    if (!config.qaBinId) { setStatus('❌ Q&A Bin ID가 필요합니다.'); return; }
    if (!confirm('정말 서버에 저장된 Q&A 전체를 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.')) return;
    setIsLoading(true); setStatus('서버 Q&A 삭제 중…');
    try {
      await proxyCall({ action: 'delete', binId: config.qaBinId, type: 'qa' });
      setData([]);
      setStatus('✅ 서버 Q&A 전체 삭제 완료');
    } catch (e) {
      setStatus('❌ Q&A 삭제 실패: ' + e.message);
    }
    setIsLoading(false);
  };

  const deleteServerIDs = async () => {
    if (!config.idsBinId) { setStatus('❌ 승인 ID Bin ID가 필요합니다.'); return; }
    if (!confirm('정말 서버에 저장된 승인 ID 전체를 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.')) return;
    setIsLoading(true); setStatus('서버 승인 ID 삭제 중…');
    try {
      await proxyCall({ action: 'delete', binId: config.idsBinId, type: 'ids' });
      setApprovedIds([]);
      setStatus('✅ 서버 승인 ID 전체 삭제 완료');
    } catch (e) {
      setStatus('❌ 승인 ID 삭제 실패: ' + e.message);
    }
    setIsLoading(false);
  };

  const isConfigured = !!config.qaBinId;
  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>서버 저장소</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 8px' }}>
        Q&A 데이터와 승인 ID를 <strong>JSONBin.io</strong>에 보관하되, 브라우저에서는 <strong>Netlify Function</strong>을 통해서만 접근합니다. API Key는 브라우저에 노출되지 않고 서버 환경변수에만 저장됩니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, margin: '20px 0 28px' }}>
        {infoCard('1️⃣', 'JSONBin.io 준비', 'JSONBin 계정 생성 후 Master Key와 Bin ID를 준비합니다')}
        {infoCard('2️⃣', 'Netlify 환경변수', 'JSONBIN_MASTER_KEY를 Netlify 환경변수에 저장합니다')}
        {infoCard('3️⃣', 'Bin ID 연결', 'Q&A Bin ID와 승인 ID Bin ID를 입력해 연결합니다')}
        {infoCard('4️⃣', '자동 반영', '환경변수에 Bin ID까지 넣으면 모든 접속자가 자동으로 최신 데이터를 받습니다')}
      </div>

      <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 16 * fontScale, fontWeight: 600 }}>Netlify Function 연결 설정</div>
          {isConfigured && <span style={{ padding: '4px 10px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 8, fontFamily: 'var(--ff-mono)', fontSize: 12 * fontScale, fontWeight: 600 }}>Bin 연결됨</span>}
        </div>

        <div style={{ padding: '14px 16px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 16, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--fg)' }}>API Key는 이 화면에 입력하지 않습니다.</strong><br />
          Netlify 사이트 설정 → 환경변수에 <code>JSONBIN_MASTER_KEY</code> 로 저장하세요.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle(fontScale)}>Q&A BIN ID</label>
            <input value={config.qaBinId} onChange={(e) => { setConfig({ ...config, qaBinId: e.target.value.trim() }); setIsDirty(true); }} placeholder="예: 64f1234567890abcd1234567" style={inp(fontScale, { width: '100%' })} />
          </div>
          <div>
            <label style={labelStyle(fontScale)}>승인 ID BIN ID</label>
            <input value={config.idsBinId} onChange={(e) => { setConfig({ ...config, idsBinId: e.target.value.trim() }); setIsDirty(true); }} placeholder="예: 64f1234567890abcd7654321" style={inp(fontScale, { width: '100%' })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button onClick={saveConfig} disabled={!isDirty || isLoading} style={{ ...pBtn(fontScale), opacity: (!isDirty || isLoading) ? 0.5 : 1 }}>설정 저장</button>
          <button onClick={testConnection} disabled={isLoading} style={{ ...sBtn2(fontScale), opacity: isLoading ? 0.5 : 1 }}>연결 테스트</button>
          <button onClick={createBins} disabled={isLoading} style={{ ...sBtn2(fontScale), opacity: isLoading ? 0.5 : 1 }}>🗑️ Bin 자동 생성 (현재 데이터로 초기화)</button>
          <button onClick={clearConfig} disabled={isLoading} style={{ ...sBtn2(fontScale), color: '#dc2626', borderColor: '#fecaca', opacity: isLoading ? 0.5 : 1 }}>설정 삭제</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--bg)' }}>
          <div style={{ fontSize: 18 * fontScale, fontWeight: 700, marginBottom: 10 }}>⬆️ 서버에 업로드</div>
          <div style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.7, marginBottom: 16 }}>
            현재 로컬 데이터(Q&A + ID)를 서버에 저장합니다. 모든 사용자가 다음 접속 시 최신 데이터를 받습니다.
          </div>
          <button onClick={pushToServer} disabled={!isConfigured || isLoading} style={{ ...pBtn(fontScale), width: '100%', opacity: (!isConfigured || isLoading) ? 0.5 : 1 }}>
            서버에 업로드 (Q&A {data.length}건, ID {approvedIds.length}건)
          </button>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--bg)' }}>
          <div style={{ fontSize: 18 * fontScale, fontWeight: 700, marginBottom: 10 }}>⬇️ 서버에서 가져오기</div>
          <div style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.7, marginBottom: 16 }}>
            서버의 최신 데이터로 현재 로컬 데이터를 교체합니다. 현재 로컬 변경사항은 덮어써집니다.
          </div>
          <button onClick={pullFromServer} disabled={!isConfigured || isLoading} style={{ ...sBtn2(fontScale), width: '100%', opacity: (!isConfigured || isLoading) ? 0.5 : 1 }}>
            서버에서 가져오기
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        <div style={{ border: '1px solid #fecaca', borderRadius: 12, padding: 20, background: '#fff7f7' }}>
          <div style={{ fontSize: 18 * fontScale, fontWeight: 700, marginBottom: 10, color: '#b91c1c' }}>🗑️ 서버 Q&A 삭제</div>
          <div style={{ fontSize: 13 * fontScale, color: '#7f1d1d', lineHeight: 1.7, marginBottom: 16 }}>
            서버에 저장된 Q&A 전체를 삭제합니다. 삭제 후 복구할 수 없습니다.
          </div>
          <button onClick={deleteServerQA} disabled={!config.qaBinId || isLoading} style={{ ...pBtn(fontScale), width: '100%', background: '#dc2626', opacity: (!config.qaBinId || isLoading) ? 0.5 : 1 }}>
            Q&A 전체 삭제
          </button>
        </div>

        <div style={{ border: '1px solid #fed7aa', borderRadius: 12, padding: 20, background: '#fffaf5' }}>
          <div style={{ fontSize: 18 * fontScale, fontWeight: 700, marginBottom: 10, color: '#c2410c' }}>🗑️ 서버 승인 ID 삭제</div>
          <div style={{ fontSize: 13 * fontScale, color: '#9a3412', lineHeight: 1.7, marginBottom: 16 }}>
            서버에 저장된 승인 ID 전체를 삭제합니다. 삭제 후 복구할 수 없습니다.
          </div>
          <button onClick={deleteServerIDs} disabled={!config.idsBinId || isLoading} style={{ ...pBtn(fontScale), width: '100%', background: '#ea580c', opacity: (!config.idsBinId || isLoading) ? 0.5 : 1 }}>
            승인 ID 전체 삭제
          </button>
        </div>
      </div>

      {status && (
        <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 8, background: status.startsWith('❌') ? '#fef2f2' : 'var(--accent-bg)', color: status.startsWith('❌') ? '#dc2626' : 'var(--accent)', fontSize: 12.5 * fontScale, fontFamily: 'var(--ff-mono)', whiteSpace: 'pre-line' }}>
          {status}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 업로드 양식 다운로드
// ─────────────────────────────────────────────────────────────
function UploadTemplatesTab({ fontScale }) {
  return <ConvertPromptTab fontScale={fontScale} />;
}

// ─────────────────────────────────────────────────────────────
// ConvertPromptTab — Q&A JSON + ID JSON 변환 프롬프트
// ─────────────────────────────────────────────────────────────
function ConvertPromptTab({ fontScale }) {
  const dl = (path) => {
    const a = document.createElement('a');
    a.href = path;
    a.download = path.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>업로드 양식 다운로드</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 18px', lineHeight: 1.8 }}>
        업로드할 엑셀 양식을 바로 내려받을 수 있습니다. 작성 후 <strong>가져오기 / 내보내기</strong> 탭에서 엑셀(.xlsx) 파일을 업로드하세요.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 24, background: 'var(--bg)' }}>
          <div style={{ fontSize: 18 * fontScale, fontWeight: 700, marginBottom: 10 }}>📄 Q&A 엑셀 공양식</div>
          <div style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.7, marginBottom: 18 }}>
            질문번호, 장, 절, 제목(키워드), 질문(원문), 답변(원문), 출처, 문서번호, 발행일 컬럼이 포함된 업로드 전용 양식입니다.
          </div>
          <button onClick={() => dl('/qna_template.xlsx')} style={{ ...pBtn(fontScale), width: '100%' }}>
            Q&A 양식 다운로드
          </button>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 24, background: 'var(--bg)' }}>
          <div style={{ fontSize: 18 * fontScale, fontWeight: 700, marginBottom: 10 }}>👥 승인 ID 엑셀 공양식</div>
          <div style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.7, marginBottom: 18 }}>
            승인ID, 이름, 역할, 활성여부, 등록일 컬럼이 포함된 업로드 전용 양식입니다.
          </div>
          <button onClick={() => dl('/id_template.xlsx')} style={{ ...pBtn(fontScale), width: '100%', background: '#059669' }}>
            승인 ID 양식 다운로드
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 8, background: 'var(--bg-sub)', border: '1px solid var(--line)', fontSize: 12.5 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.8 }}>
        💡 양식 파일도 GitHub/Netlify 배포 파일에 포함되어 있어야 다운로드가 동작합니다. 저장소 루트에 <code>qna_template.xlsx</code> 와 <code>id_template.xlsx</code> 파일을 함께 올려주세요.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DeployGuide
// ─────────────────────────────────────────────────────────────
 (unchanged)
// ─────────────────────────────────────────────────────────────
function DeployGuide({ fontScale }) {
  const cardStyle = { border: '1px solid var(--line)', borderRadius: 12, padding: 24, marginBottom: 20, background: 'var(--bg)' };
  const kbd = { fontFamily: 'var(--ff-mono)', fontSize: 11.5 * fontScale, background: 'var(--bg-sub)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 4, color: 'var(--fg)' };
  const code = { fontFamily: 'var(--ff-mono)', fontSize: 12 * fontScale, background: 'var(--bg-sub)', padding: '2px 6px', borderRadius: 3, color: 'var(--accent)' };
  const num = (n) => <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', fontWeight: 600, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>{n}</span>;
  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>배포 / 공유 가이드</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 28px' }}>이 앱을 다른 사용자에게 배포하거나 공유하는 방법입니다. 용도와 기술 수준에 맞춰 선택하세요.</p>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 10 * fontScale, padding: '2px 7px', background: '#10b98118', color: '#059669', borderRadius: 3, fontFamily: 'var(--ff-mono)', fontWeight: 600 }}>가장 쉬움</span>
          <h3 style={{ fontSize: 16 * fontScale, margin: 0, fontWeight: 600 }}>방법 1 · 단일 HTML 파일로 공유 (오프라인)</h3>
        </div>
        <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 16px', lineHeight: 1.7 }}>전체 앱을 <strong>하나의 파일</strong>로 번들링하여 이메일·메신저·USB로 전달. 서버·인터넷 불필요.</p>
        <div style={{ fontSize: 13 * fontScale, lineHeight: 2, color: 'var(--fg)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>{num(1)}<div>오른쪽 상단 공유/저장 메뉴에서 <span style={kbd}>Save as standalone HTML</span> 선택</div></div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>{num(2)}<div>생성된 <span style={code}>.html</span> 파일을 다운로드</div></div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>{num(3)}<div>이메일 첨부·클라우드 링크·USB 등으로 전달</div></div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>{num(4)}<div>받은 사람이 파일을 더블클릭 → 기본 브라우저에서 앱 실행</div></div>
        </div>
        <div style={{ marginTop: 14, padding: '10px 12px', background: '#fef3c718', border: '1px solid #fde68a80', borderRadius: 6, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--fg)' }}>주의.</strong> 데이터가 각자의 브라우저에 따로 저장되므로 <strong>공유 후 관리자가 Q&A나 ID를 수정해도 다른 사람들에게는 자동 반영되지 않습니다.</strong> 실시간 동기화는 <strong>서버 저장소</strong> 탭을 사용하세요.
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 10 * fontScale, padding: '2px 7px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 3, fontFamily: 'var(--ff-mono)', fontWeight: 600 }}>추천 · 웹 공개</span>
          <h3 style={{ fontSize: 16 * fontScale, margin: 0, fontWeight: 600 }}>방법 2 · 정적 웹 호스팅으로 URL 공유</h3>
        </div>
        <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 16px', lineHeight: 1.7 }}>프로젝트 파일을 무료 정적 호스팅 서비스에 업로드하여 <strong>링크 하나로 공유</strong>.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[{ name: 'Netlify Drop', url: 'app.netlify.com/drop', desc: '드래그&드롭 1분 배포' }, { name: 'Vercel', url: 'vercel.com', desc: 'GitHub 연동 자동 배포' }, { name: 'GitHub Pages', url: 'pages.github.com', desc: '리포지토리 기반 무료' }, { name: 'Cloudflare Pages', url: 'pages.cloudflare.com', desc: '빠른 CDN' }].map(s => (
            <div key={s.name} style={{ padding: 12, background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13 * fontScale, marginBottom: 3 }}>{s.name}</div>
              <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--accent)', marginBottom: 4 }}>{s.url}</div>
              <div style={{ fontSize: 11.5 * fontScale, color: 'var(--muted)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────
const inp = (fs, e = {}) => ({ padding: '10px 12px', fontSize: 14 * fs, fontFamily: 'var(--ff-sans)', border: '1px solid var(--line-strong)', borderRadius: 7, background: 'var(--bg-input)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box', ...e });
const sBtn = (fs) => ({ padding: '5px 11px', fontSize: 12 * fs, background: 'var(--bg-sub)', border: '1px solid var(--line-strong)', borderRadius: 5, cursor: 'pointer', color: 'var(--fg)' });
const pBtn = (fs) => ({ padding: '10px 14px', fontSize: 13 * fs, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 });
const sBtn2 = (fs) => ({ padding: '10px 14px', fontSize: 13 * fs, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--line-strong)', borderRadius: 7, cursor: 'pointer' });
const segB = (on, fs, e = {}) => ({ flex: 1, padding: '6px', border: 'none', background: on ? 'var(--bg)' : 'transparent', color: on ? 'var(--fg)' : 'var(--fg-sub)', fontSize: 12 * fs, borderRadius: 4, cursor: 'pointer', fontWeight: on ? 500 : 400, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', ...e });

window.AdminPanel = AdminPanel;
window.getStoredServerConfig = getStoredServerConfig;
window.jsonbinFetch = jsonbinFetch;
window.jsonbinPut = jsonbinPut;
