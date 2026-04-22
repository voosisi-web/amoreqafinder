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
    { k: 'convert', label: '엑셀/PDF → JSON 변환' },
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
  'id': 'id', 'ID': 'id', '아이디': 'id', '사용자id': 'id', '사용자 id': 'id',
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

// ─────────────────────────────────────────────────────────────
// ImportExport — JSON & 엑셀 가져오기/내보내기
// ─────────────────────────────────────────────────────────────
function ImportExport({ data, setData, approvedIds, setApprovedIds, fontScale }) {
  const [mode, setMode] = React.useState('append');
  const [msg, setMsg] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const qJsonRef = React.useRef(null);
  const qXlsxRef = React.useRef(null);
  const iJsonRef = React.useRef(null);
  const iXlsxRef = React.useRef(null);

  const exp = (obj, fn) => {
    const b = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(b); const a = document.createElement('a');
    a.href = u; a.download = fn; a.click(); URL.revokeObjectURL(u);
  };

  // ── Q&A 가져오기 ──
  const impQAJson = async (file) => {
    try {
      const p = JSON.parse(await file.text());
      if (!Array.isArray(p)) throw new Error('배열 형식이어야 합니다');
      applyQA(p);
    } catch (e) { setMsg('❌ 실패: ' + e.message); }
    if (qJsonRef.current) qJsonRef.current.value = '';
  };

  const impQAXlsx = async (file) => {
    setIsLoading(true); setMsg('엑셀 파일 읽는 중…');
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) throw new Error('데이터가 없습니다');
      const maxId = mode === 'replace' ? 0 : Math.max(0, ...data.map(d => d.id || 0));
      const items = rows.map((r, i) => xlsxRowToQA(r, i, maxId)).filter(Boolean);
      if (!items.length) throw new Error('인식된 Q&A 행이 없습니다. 컬럼명을 확인하세요.');
      applyQA(items, true);
    } catch (e) { setMsg('❌ 실패: ' + e.message); }
    if (qXlsxRef.current) qXlsxRef.current.value = '';
    setIsLoading(false);
  };

  const applyQA = (items, fromXlsx = false) => {
    const label = fromXlsx ? '엑셀' : 'JSON';
    if (mode === 'replace') {
      setData(items);
      setMsg(`✅ ${label} 전체 교체 완료: ${items.length}건`);
    } else {
      const maxId = Math.max(0, ...data.map(d => d.id || 0));
      const merged = items.map((it, i) => ({ ...it, id: it.id || (maxId + i + 1) }));
      setData([...data, ...merged]);
      setMsg(`✅ ${label} 추가 완료: ${merged.length}건`);
    }
  };

  // ── 승인 ID 가져오기 ──
  const impIdJson = async (file) => {
    try {
      const p = JSON.parse(await file.text());
      if (!Array.isArray(p)) throw new Error('배열 형식이어야 합니다');
      setApprovedIds(p);
      setMsg(`✅ JSON ID 교체 완료: ${p.length}건`);
    } catch (e) { setMsg('❌ 실패: ' + e.message); }
    if (iJsonRef.current) iJsonRef.current.value = '';
  };

  const impIdXlsx = async (file) => {
    setIsLoading(true); setMsg('엑셀 파일 읽는 중…');
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) throw new Error('데이터가 없습니다');
      const items = rows.map(xlsxRowToID).filter(Boolean);
      if (!items.length) throw new Error('인식된 ID 행이 없습니다. "ID" 컬럼이 있는지 확인하세요.');
      setApprovedIds(items);
      setMsg(`✅ 엑셀 ID 교체 완료: ${items.length}건`);
    } catch (e) { setMsg('❌ 실패: ' + e.message); }
    if (iXlsxRef.current) iXlsxRef.current.value = '';
    setIsLoading(false);
  };

  const xlsxAvailable = !!window.XLSX;

  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>가져오기 / 내보내기</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 8px' }}>
        Q&A 데이터와 승인 ID를 <strong>JSON</strong> 또는 <strong>엑셀(.xlsx)</strong> 파일로 바로 업로드·다운로드합니다.
      </p>

      {/* 엑셀 컬럼 안내 */}
      <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--accent-bg)', border: '1px solid var(--line-strong)', borderRadius: 8, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--accent)' }}>📋 엑셀 컬럼명 가이드</strong>
        <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div><strong style={{ color: 'var(--fg)' }}>Q&A 엑셀</strong> — 첫 행이 헤더여야 합니다<br />
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 * fontScale }}>
              질문번호(qnum) · 제목(title) · 질문(question) · 답변(answer) · 출처(sourceFile) · 장 · 절 · 발행일(date) · 연도(year) · 카테고리(유형)
            </span>
          </div>
          <div><strong style={{ color: 'var(--fg)' }}>ID 엑셀</strong> — ID 컬럼만 필수<br />
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 * fontScale }}>
              ID(필수) · 이름(name) · 역할(role: user/admin) · 활성여부(active: true/false) · 등록일(addedAt)
            </span>
          </div>
        </div>
      </div>

      {!xlsxAvailable && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12 * fontScale, color: '#dc2626' }}>
          ⚠️ 엑셀 파서가 로드되지 않았습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해 주세요.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Q&A 패널 ── */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 20, background: 'var(--bg-sub)' }}>
          <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Q&A 데이터 ({data.length}건)
          </div>
          <button onClick={() => exp(data, `qa-export-${Date.now()}.json`)} style={{ ...pBtn(fontScale), marginBottom: 16, width: '100%' }}>
            ⬇ JSON으로 내보내기
          </button>

          <div style={{ fontSize: 11 * fontScale, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--ff-mono)', textTransform: 'uppercase', letterSpacing: 0.6 }}>가져오기 모드</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, padding: 3, background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 6 }}>
            <button onClick={() => setMode('append')} style={segB(mode === 'append', fontScale)}>추가</button>
            <button onClick={() => setMode('replace')} style={segB(mode === 'replace', fontScale)}>전체 교체</button>
          </div>

          {/* JSON 업로드 */}
          <input ref={qJsonRef} type="file" accept=".json" onChange={(e) => e.target.files[0] && impQAJson(e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => qJsonRef.current?.click()} style={{ ...sBtn2(fontScale), width: '100%', marginBottom: 8 }}>
            📄 JSON 파일 선택…
          </button>

          {/* 엑셀 업로드 */}
          <input ref={qXlsxRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files[0] && impQAXlsx(e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => qXlsxRef.current?.click()} disabled={!xlsxAvailable || isLoading}
            style={{ ...sBtn2(fontScale), width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)', opacity: (!xlsxAvailable || isLoading) ? 0.5 : 1, cursor: (!xlsxAvailable || isLoading) ? 'not-allowed' : 'pointer' }}>
            📊 엑셀(.xlsx) 파일 선택…
          </button>
        </div>

        {/* ── 승인 ID 패널 ── */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 20, background: 'var(--bg-sub)' }}>
          <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            승인 ID ({approvedIds.length}건) — 항상 전체 교체
          </div>
          <button onClick={() => exp(approvedIds, `ids-export-${Date.now()}.json`)} style={{ ...pBtn(fontScale), marginBottom: 16, width: '100%' }}>
            ⬇ JSON으로 내보내기
          </button>

          {/* JSON 업로드 */}
          <input ref={iJsonRef} type="file" accept=".json" onChange={(e) => e.target.files[0] && impIdJson(e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => iJsonRef.current?.click()} style={{ ...sBtn2(fontScale), width: '100%', marginBottom: 8 }}>
            📄 JSON 파일 선택…
          </button>

          {/* 엑셀 업로드 */}
          <input ref={iXlsxRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files[0] && impIdXlsx(e.target.files[0])} style={{ display: 'none' }} />
          <button onClick={() => iXlsxRef.current?.click()} disabled={!xlsxAvailable || isLoading}
            style={{ ...sBtn2(fontScale), width: '100%', borderColor: '#059669', color: '#059669', opacity: (!xlsxAvailable || isLoading) ? 0.5 : 1, cursor: (!xlsxAvailable || isLoading) ? 'not-allowed' : 'pointer' }}>
            📊 엑셀(.xlsx) 파일 선택…
          </button>

          <div style={{ marginTop: 12, fontSize: 11 * fontScale, color: 'var(--muted)', lineHeight: 1.6 }}>
            업로드 후 <strong>서버 저장소 탭 → 서버에 업로드</strong>를 실행하면 모든 사용자에게 즉시 반영됩니다.
          </div>
        </div>
      </div>

      {isLoading && <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-sub)', fontSize: 12.5 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }}>처리 중…</div>}
      {msg && !isLoading && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: msg.includes('❌') ? '#fef2f2' : 'var(--accent-bg)', color: msg.includes('❌') ? '#dc2626' : 'var(--accent)', fontSize: 12.5 * fontScale, fontFamily: 'var(--ff-mono)', whiteSpace: 'pre-line' }}>
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
      setStatus(`✅ Bin 생성 완료! Q&A Bin: ${qId} / ID Bin: ${iId}\n현재 데이터(Q&A ${data.length}건, ID ${approvedIds.length}건)를 초기 업로드했습니다.`);
    } catch (e) { setStatus('❌ 생성 실패: ' + e.message); }
    setIsLoading(false);
  };

  const pullFromServer = async () => {
    if (!config.qaBinId) { setStatus('❌ Q&A Bin ID가 필요합니다.'); return; }
    if (!confirm('서버에서 데이터를 가져오면 현재 로컬 데이터가 덮어쓰입니다. 계속하시겠습니까?')) return;
    setIsLoading(true); setStatus('서버에서 가져오는 중…');
    try {
      const msgs = [];
      if (config.qaBinId) { const qaRes = await jsonbinFetch(config.qaBinId, 'qa'); const qa = Array.isArray(qaRes) ? qaRes : (Array.isArray(qaRes?.qa) ? qaRes.qa : (Array.isArray(qaRes?.data) ? qaRes.data : null)); if (Array.isArray(qa)) { setData(qa); msgs.push(`Q&A ${qa.length}건`); } }
      if (config.idsBinId) { const idsRes = await jsonbinFetch(config.idsBinId, 'ids'); const ids = Array.isArray(idsRes) ? idsRes : (Array.isArray(idsRes?.ids) ? idsRes.ids : (Array.isArray(idsRes?.data) ? idsRes.data : null)); if (Array.isArray(ids)) { setApprovedIds(ids); msgs.push(`승인 ID ${ids.length}건`); } }
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
      if (config.idsBinId) { await jsonbinPut(config.idsBinId, approvedIds, 'ids'); msgs.push(`승인 ID ${approvedIds.length}건`); }
      setStatus(`✅ 업로드 완료: ${msgs.join(', ')} — 모든 사용자가 다음 접속 시 최신 데이터를 받게 됩니다.`);
    } catch (e) { setStatus('❌ 업로드 실패: ' + e.message); }
    setIsLoading(false);
  };

  const isConfigured = !!config.qaBinId;
  const updateCfg = (k, v) => { setConfig(c => ({ ...c, [k]: v })); setIsDirty(true); };

  const infoCard = (icon, title, desc) => (
    <div style={{ padding: '14px 16px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 8 }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 * fontScale, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>서버 저장소</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 24px', lineHeight: 1.7 }}>
        Q&A 데이터와 승인 ID를 <strong>JSONBin.io</strong>에 보관하되, 브라우저에서는 <strong>Netlify Function</strong>을 통해서만 접근합니다. API Key는 브라우저에 노출되지 않고 서버 환경변수에만 저장됩니다.
      </p>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
        {infoCard('1️⃣', 'JSONBin.io 준비', 'JSONBin 계정 생성 후 Master Key와 Bin ID를 준비합니다')}
        {infoCard('2️⃣', 'Netlify 환경변수', 'JSONBIN_MASTER_KEY를 Netlify 환경변수에 저장합니다')}
        {infoCard('3️⃣', 'Bin ID 연결', 'Q&A Bin ID와 승인 ID Bin ID를 입력해 연결합니다')}
        {infoCard('4️⃣', '자동 반영', '환경변수에 Bin ID까지 넣으면 모든 접속자가 자동으로 최신 데이터를 받습니다')}
      </div>

      {/* Config form */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 22, marginBottom: 20, background: 'var(--bg)' }}>
        <div style={{ fontSize: 13 * fontScale, fontWeight: 600, marginBottom: 16 }}>
          Netlify Function 연결 설정
          {isConfigured && <span style={{ marginLeft: 10, padding: '2px 8px', background: '#10b98118', color: '#059669', borderRadius: 4, fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)' }}>Bin 연결됨</span>}
        </div>

        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--fg)' }}>API Key는 이 화면에 입력하지 않습니다.</strong><br />
          Netlify 사이트 설정 → 환경변수에 <code>JSONBIN_MASTER_KEY</code> 로 저장하세요.
          <a href="https://jsonbin.io/api-reference" target="_blank" rel="noopener" style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 11 * fontScale, fontWeight: 400 }}>발급 방법 ↗</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Q&A Bin ID</label>
            <input value={config.qaBinId} onChange={(e) => updateCfg('qaBinId', e.target.value)} placeholder="예: 64f1234567890abcd1234567" style={inp(fontScale, { width: '100%', fontFamily: 'var(--ff-mono)', fontSize: 13 * fontScale })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>승인 ID Bin ID</label>
            <input value={config.idsBinId} onChange={(e) => updateCfg('idsBinId', e.target.value)} placeholder="예: 64f1234567890abcd7654321" style={inp(fontScale, { width: '100%', fontFamily: 'var(--ff-mono)', fontSize: 13 * fontScale })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={saveConfig} disabled={!isDirty || isLoading} style={{ ...pBtn(fontScale), opacity: (!isDirty || isLoading) ? 0.5 : 1 }}>설정 저장</button>
          <button onClick={testConnection} disabled={isLoading} style={{ ...sBtn2(fontScale), opacity: isLoading ? 0.5 : 1 }}>연결 테스트</button>
          <button onClick={createBins} disabled={isLoading} style={{ ...sBtn2(fontScale), opacity: isLoading ? 0.5 : 1 }}>
            🪣 Bin 자동 생성 (현재 데이터로 초기화)
          </button>
          {isConfigured && <button onClick={clearConfig} style={{ padding: '10px 14px', fontSize: 13 * fontScale, background: 'none', color: '#dc2626', border: '1px solid #dc262640', borderRadius: 7, cursor: 'pointer' }}>설정 삭제</button>}
        </div>
      </div>

      {/* Push / Pull */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--bg)' }}>
          <div style={{ fontSize: 13 * fontScale, fontWeight: 600, marginBottom: 6 }}>⬆️ 서버에 업로드</div>
          <div style={{ fontSize: 12 * fontScale, color: 'var(--fg-sub)', marginBottom: 16, lineHeight: 1.5 }}>현재 로컬 데이터(Q&A + ID)를 서버에 저장합니다. 모든 사용자가 다음 접속 시 최신 데이터를 받습니다.</div>
          <button onClick={pushToServer} disabled={!isConfigured || isLoading} style={{ ...pBtn(fontScale), width: '100%', opacity: (!isConfigured || isLoading) ? 0.5 : 1 }}>
            {isLoading ? '처리 중…' : `서버에 업로드 (Q&A ${data.length}건, ID ${approvedIds.length}건)`}
          </button>
        </div>
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--bg)' }}>
          <div style={{ fontSize: 13 * fontScale, fontWeight: 600, marginBottom: 6 }}>⬇️ 서버에서 가져오기</div>
          <div style={{ fontSize: 12 * fontScale, color: 'var(--fg-sub)', marginBottom: 16, lineHeight: 1.5 }}>서버의 최신 데이터로 현재 로컬 데이터를 교체합니다. 현재 로컬 변경사항은 덮어써집니다.</div>
          <button onClick={pullFromServer} disabled={!isConfigured || isLoading} style={{ ...sBtn2(fontScale), width: '100%', opacity: (!isConfigured || isLoading) ? 0.5 : 1 }}>
            {isLoading ? '처리 중…' : '서버에서 가져오기'}
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: status.startsWith('❌') ? '#fef2f2' : status.startsWith('✅') ? 'var(--accent-bg)' : 'var(--bg-sub)', color: status.startsWith('❌') ? '#dc2626' : status.startsWith('✅') ? 'var(--accent)' : 'var(--fg-sub)', fontSize: 12.5 * fontScale, fontFamily: 'var(--ff-mono)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {status}
        </div>
      )}

      {/* Note */}
      <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--fg)' }}>🔒 보안 참고.</strong> API 키는 이 브라우저의 localStorage에 저장됩니다. 개인 또는 사내 업무용으로 적합하며, 공용 PC에서는 사용 후 "설정 삭제"를 권장합니다. 서버 자동 동기화는 로드 시 1회 발생하므로 데이터 변경 후에는 반드시 "서버에 업로드" 버튼을 눌러주세요.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ConvertPromptTab — Q&A JSON + ID JSON 변환 프롬프트
// ─────────────────────────────────────────────────────────────
function ConvertPromptTab({ fontScale }) {
  const [copiedQA, setCopiedQA] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);
  const [activePrompt, setActivePrompt] = React.useState('qa'); // 'qa' | 'id'

  const QA_PROMPT = `다음 첨부된 엑셀(.xlsx) 또는 PDF 파일을 아래 스키마의 JSON 배열로 변환해 주세요.

[출력 스키마 — 객체 1개 = Q&A 1건]
{
  "id": 정수 (1부터 증가),
  "qnum": "Q1-1" 또는 "1-1" 같은 질문번호 문자열,
  "category": "화장품" | "건강기능식품" | "의약외품" | "의료기기" 중 해당하는 값,
  "chapter": "제1장 총칙" 같은 장 이름 (없으면 ""),
  "section": "제1절" 같은 절 이름 (없으면 ""),
  "title": 질문 한 줄 요약 제목,
  "question": 원문 질문 전체,
  "answer": 원문 답변 전체 (줄바꿈은 \\n 으로 유지),
  "source": "식품의약품안전처" 등 발행기관,
  "sourceFile": 원본 파일명 (예: "화장품 자주하는 질문집 2024"),
  "docNum": 문서번호 (없으면 ""),
  "date": "YYYY.MM.DD" 형식 발행일,
  "year": 정수 연도,
  "functional": 기능성 화장품 관련이면 true, 아니면 false
}

[규칙]
1. 출력은 유효한 JSON 배열 하나만. 앞뒤 설명·마크다운·코드펜스 금지.
2. category는 파일 제목이나 내용으로 판단: 화장품 관련→"화장품", 건강기능식품/식품→"건강기능식품", 의약외품→"의약외품", 의료기기→"의료기기".
3. 질문·답변에 있는 표는 텍스트로 풀어 쓰되 줄바꿈 유지.
4. 장/절 제목이 별도 행으로 나오면 그 아래 모든 Q&A의 chapter/section에 동일 값 채움.
5. title은 30자 이내로 질문을 압축. question이 이미 짧으면 그대로 사용.
6. 빈 셀은 "" (빈 문자열), 숫자 필드가 비면 0 또는 해당 연도.
7. id는 1부터 순번. qnum이 "Q1-1"이면 그대로 사용, 없으면 "A-1", "A-2" 식으로 생성.
8. functional은 파일명/제목에 "기능성"이 포함되거나 자외선차단·미백·주름·염모 관련이면 true.
9. 다 변환한 후 "JSON 가져오기/내보내기 → Q&A 데이터 → JSON 파일 선택…" 에서 "추가" 또는 "전체 교체" 모드로 업로드.

파일을 첨부해 드립니다. 변환 시작해주세요.`;

  const ID_PROMPT = `다음 첨부된 엑셀(.xlsx) 파일에 정리된 승인 ID 목록을 아래 스키마의 JSON 배열로 변환해 주세요.

[출력 스키마 — 객체 1개 = 사용자 1명]
{
  "id": "사용자 ID 문자열 (예: user001)",
  "name": "이름 또는 설명 (없으면 빈 문자열 \\"\\"),
  "role": "user" 또는 "admin" (관리자 여부),
  "active": true 또는 false (접속 허용 여부),
  "addedAt": "YYYY-MM-DD 형식 등록일 (예: 2025-01-15)"
}

[규칙]
1. 출력은 유효한 JSON 배열 하나만. 앞뒤 설명·마크다운·코드펜스 금지.
2. role 컬럼이 없거나 비어 있으면 모두 "user"로 설정.
3. active 컬럼이 없거나 비어 있으면 모두 true로 설정.
4. addedAt이 없으면 오늘 날짜(YYYY-MM-DD) 사용.
5. ID 컬럼이 비어있는 행은 건너뜀.
6. ID에 공백이 있으면 제거하고 저장.
7. 변환 완료 후 "JSON 가져오기/내보내기 → 승인 ID → JSON 파일 선택(전체 교체)" 에서 업로드.
8. 또는 "서버 저장소" 탭에서 "서버에 업로드"로 전체 사용자에게 즉시 적용 가능.

[엑셀 컬럼 예시]
| ID (필수) | 이름 | 권한(user/admin) | 활성(true/false) | 등록일 |
|-----------|------|-----------------|-----------------|--------|
| user001   | 홍길동 | user           | true            | 2025-01-15 |

엑셀 파일을 첨부해 드립니다. 변환 시작해주세요.`;

  const copyQA = () => { navigator.clipboard.writeText(QA_PROMPT); setCopiedQA(true); setTimeout(() => setCopiedQA(false), 1800); };
  const copyId = () => { navigator.clipboard.writeText(ID_PROMPT); setCopiedId(true); setTimeout(() => setCopiedId(false), 1800); };

  return (
    <div>
      <h2 style={{ fontSize: 20 * fontScale, margin: '0 0 6px', fontWeight: 600 }}>엑셀 / PDF → JSON 변환</h2>
      <p style={{ fontSize: 13 * fontScale, color: 'var(--fg-sub)', margin: '0 0 24px', lineHeight: 1.7 }}>
        ChatGPT, Claude 등 LLM에 원본 파일을 첨부하고 아래 프롬프트를 붙여넣으면 바로 사용 가능한 JSON을 받을 수 있습니다.
        받은 JSON은 <strong>JSON 가져오기/내보내기</strong> 탭에서 업로드하세요.
      </p>

      {/* Prompt selector */}
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-sub)', border: '1px solid var(--line-strong)', borderRadius: 9, marginBottom: 24, width: 'fit-content' }}>
        <button onClick={() => setActivePrompt('qa')} style={segB(activePrompt === 'qa', fontScale, { padding: '8px 20px', fontSize: 13 * fontScale })}>📄 Q&A JSON 변환 프롬프트</button>
        <button onClick={() => setActivePrompt('id')} style={segB(activePrompt === 'id', fontScale, { padding: '8px 20px', fontSize: 13 * fontScale })}>👥 승인 ID JSON 변환 프롬프트</button>
      </div>

      {/* QA Prompt */}
      {activePrompt === 'qa' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
            {[{ n: 1, t: '프롬프트 복사', d: '아래 버튼 클릭' }, { n: 2, t: 'LLM에 붙여넣기', d: 'ChatGPT / Claude' }, { n: 3, t: '원본 파일 첨부', d: '.xlsx 또는 .pdf' }, { n: 4, t: 'JSON 업로드', d: '가져오기/내보내기 탭' }].map(s => (
              <div key={s.n} style={{ padding: 14, background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{s.n}</div>
                <div style={{ fontSize: 13 * fontScale, fontWeight: 600, marginBottom: 2 }}>{s.t}</div>
                <div style={{ fontSize: 11 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 20, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Q&A 변환 프롬프트</div>
              <button onClick={copyQA} style={{ ...pBtn(fontScale) }}>{copiedQA ? '✓ 복사됨' : '프롬프트 복사'}</button>
            </div>
            <pre style={{ margin: 0, padding: 16, background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--fg-sub)', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 440, overflow: 'auto' }}>{QA_PROMPT}</pre>
          </div>
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--accent-bg)', borderRadius: 8, fontSize: 12.5 * fontScale, color: 'var(--accent)', lineHeight: 1.7 }}>
            <strong style={{ fontWeight: 600 }}>💡 권장 LLM.</strong> 긴 문서 처리가 안정적인 <strong>Claude (Anthropic)</strong> 또는 <strong>ChatGPT (GPT-4o)</strong>. 대용량 PDF는 장별로 쪼개 여러 번 요청 후 JSON을 합쳐서 업로드하세요.
          </div>
        </div>
      )}

      {/* ID Prompt */}
      {activePrompt === 'id' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
            {[{ n: 1, t: '프롬프트 복사', d: '아래 버튼 클릭' }, { n: 2, t: 'LLM에 붙여넣기', d: 'ChatGPT / Claude' }, { n: 3, t: '엑셀 파일 첨부', d: 'ID 목록 .xlsx' }, { n: 4, t: 'ID JSON 업로드', d: '가져오기/내보내기 탭' }].map(s => (
              <div key={s.n} style={{ padding: 14, background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#059669', color: '#fff', fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{s.n}</div>
                <div style={{ fontSize: 13 * fontScale, fontWeight: 600, marginBottom: 2 }}>{s.t}</div>
                <div style={{ fontSize: 11 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }}>{s.d}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b98133', borderRadius: 8, fontSize: 12.5 * fontScale, color: '#059669', lineHeight: 1.7, marginBottom: 20 }}>
            <strong>💡 업로드 후 서버 동기화.</strong> JSON 업로드 후 <strong>서버 저장소 탭 → 서버에 업로드</strong>를 실행하면, 모든 승인된 사용자에게 즉시 새 ID 목록이 적용됩니다.
          </div>

          <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 20, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>승인 ID 변환 프롬프트</div>
              <button onClick={copyId} style={{ ...pBtn(fontScale), background: '#059669' }}>{copiedId ? '✓ 복사됨' : '프롬프트 복사'}</button>
            </div>
            <pre style={{ margin: 0, padding: 16, background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--fg-sub)', whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 440, overflow: 'auto' }}>{ID_PROMPT}</pre>
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--fg)' }}>엑셀 컬럼 가이드.</strong> 필수 컬럼은 <strong>ID</strong>만입니다. 선택 컬럼으로 이름, 권한(user/admin), 활성여부(true/false), 등록일을 추가할 수 있습니다. LLM에 파일을 첨부할 때 열 이름을 알려주면 더 정확하게 변환됩니다.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DeployGuide (unchanged)
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
