// variation-b.jsx — Category picker + Command palette / single-column layout
// Centered search, expandable result cards, inline detail view

const CATEGORIES = [
  { id: '화장품',      label: '화장품',              emoji: '🧴', desc: '일반화장품 · 기능성화장품',    color: '#1d4ed8', bgColor: '#eff4ff' },
  { id: '건강기능식품', label: '건강기능식품 / 식품',  emoji: '🌿', desc: '건강기능식품 · 식품',          color: '#059669', bgColor: '#ecfdf5' },
  { id: '의약외품',    label: '의약외품',              emoji: '🩹', desc: '의약외품 관련 Q&A',          color: '#d97706', bgColor: '#fffbeb' },
  { id: '의료기기',    label: '의료기기',              emoji: '🏥', desc: '의료기기 관련 Q&A',          color: '#7c3aed', bgColor: '#f5f3ff' },
];
window.CATEGORIES = CATEGORIES;

// ─────────────────────────────────────────────────────────────
// CategorySelect — landing page before search
// ─────────────────────────────────────────────────────────────
function CategorySelect({ data, onSelect, fontScale }) {
  const counts = React.useMemo(() => {
    const m = {};
    CATEGORIES.forEach(c => { m[c.id] = 0; });
    data.forEach(item => {
      const cat = item.category || '화장품';
      if (m[cat] !== undefined) m[cat]++;
    });
    return m;
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--ff-sans)', color: 'var(--fg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '80px 32px 60px' }}>
        <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
          식품의약품안전처 · 자주하는 질문집
        </div>
        <h1 style={{ fontSize: 36 * fontScale, fontWeight: 700, letterSpacing: -0.8, margin: '0 0 8px', color: 'var(--fg)' }}>
          Q&amp;A 검색
        </h1>
        <div style={{ fontSize: 14 * fontScale, color: 'var(--fg-sub)', marginBottom: 48 }}>
          검색할 유형을 먼저 선택해주세요
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 16 }}>
          {CATEGORIES.map(cat => {
            const count = counts[cat.id] || 0;
            const available = count > 0;
            return (
              <button
                key={cat.id}
                onClick={() => available && onSelect(cat.id)}
                style={{
                  padding: '28px 22px 22px',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--line-strong)',
                  borderRadius: 16,
                  cursor: available ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  fontFamily: 'var(--ff-sans)',
                  opacity: available ? 1 : 0.4,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!available) return;
                  e.currentTarget.style.borderColor = cat.color;
                  e.currentTarget.style.background = cat.bgColor;
                  e.currentTarget.style.boxShadow = `0 8px 32px ${cat.color}28`;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line-strong)';
                  e.currentTarget.style.background = 'var(--bg)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = '';
                }}
              >
                <div style={{ fontSize: 34, marginBottom: 14, lineHeight: 1 }}>{cat.emoji}</div>
                <div style={{ fontSize: 16 * fontScale, fontWeight: 700, color: 'var(--fg)', marginBottom: 5 }}>{cat.label}</div>
                <div style={{ fontSize: 12 * fontScale, color: 'var(--fg-sub)', marginBottom: 16, lineHeight: 1.5 }}>{cat.desc}</div>
                <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: available ? cat.color : 'var(--muted)', fontWeight: 600 }}>
                  {available ? `${count.toLocaleString()}건` : '데이터 없음'}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 32, padding: '14px 18px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.65 }}>
          💡 <strong style={{ color: 'var(--fg)' }}>데이터 없음</strong>으로 표시된 유형은 관리자 콘솔 → <strong>JSON 가져오기/내보내기</strong> 탭에서 해당 카테고리 Q&A JSON을 업로드하면 활성화됩니다.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VariationB — main search UI (requires selectedCategory)
// New props: selectedCategory, setSelectedCategory
// ─────────────────────────────────────────────────────────────
function VariationB({ data, query, setQuery, filters, setFilters, expandedId, setExpandedId, density, fontScale, selectedCategory, setSelectedCategory }) {

  // ── No category selected → show category picker ──
  if (!selectedCategory) {
    return <CategorySelect data={data} onSelect={setSelectedCategory} fontScale={fontScale} />;
  }

  // ── Filter data by selected category ──
  const categoryData = React.useMemo(
    () => data.filter(item => (item.category || '화장품') === selectedCategory),
    [data, selectedCategory]
  );

  const catInfo = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

  const parsed = React.useMemo(() => window.QA.parseQuery(query), [query]);
  const searchResult = React.useMemo(() => window.QA.search(categoryData, query, filters), [categoryData, query, filters]);
  const [showFilters, setShowFilters] = React.useState(false);

  const sources = React.useMemo(() => {
    const m = new Map();
    categoryData.forEach(i => m.set(i.sourceFile, (m.get(i.sourceFile) || 0) + 1));
    return [...m.entries()].map(([k, v]) => ({ key: k, count: v }));
  }, [categoryData]);

  const chapters = React.useMemo(() => {
    const m = new Map();
    categoryData.forEach(i => {
      if (!i.chapter) return;
      if (!m.has(i.chapter)) m.set(i.chapter, { key: i.chapter, source: i.sourceFile, count: 0 });
      m.get(i.chapter).count++;
    });
    return [...m.values()];
  }, [categoryData]);

  const cardPad = density === 'compact' ? '14px 20px' : '22px 26px';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--ff-sans)', fontSize: 14 * fontScale }}>

      {/* Hero */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 32px 32px' }}>

        {/* Category breadcrumb + change button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => { setSelectedCategory(null); setQuery(''); setFilters({}); }}
            style={{ padding: '5px 11px', background: 'var(--bg-sub)', border: '1px solid var(--line-strong)', borderRadius: 6, fontSize: 12 * fontScale, color: 'var(--fg-sub)', cursor: 'pointer', fontFamily: 'var(--ff-mono)' }}
          >
            ← 유형 변경
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: catInfo.bgColor, border: `1px solid ${catInfo.color}44`, borderRadius: 6 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{catInfo.emoji}</span>
            <span style={{ fontSize: 12 * fontScale, fontWeight: 600, color: catInfo.color, fontFamily: 'var(--ff-mono)' }}>{catInfo.label}</span>
          </div>
        </div>

        <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
          식품의약품안전처 · 자주하는 질문집
        </div>
        <h1 style={{ fontSize: 38 * fontScale, fontWeight: 700, letterSpacing: -0.8, margin: '0 0 8px', lineHeight: 1.1, color: 'var(--fg)' }}>
          {catInfo.label} Q&amp;A 검색
        </h1>
        <div style={{ fontSize: 14 * fontScale, color: 'var(--fg-sub)', marginBottom: 28 }}>
          {catInfo.desc} <span style={{ color: 'var(--muted)' }}>· 총 {categoryData.length}건</span>
        </div>

        {/* Big search bar */}
        <div style={{ position: 'relative' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" fill="none"/>
            <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="키워드 또는 자연어 질문 입력…"
            style={{
              width: '100%', padding: '20px 20px 20px 54px',
              fontSize: 18 * fontScale, fontFamily: 'var(--ff-sans)',
              border: '1px solid var(--line-strong)', borderRadius: 14,
              background: 'var(--bg-input)', color: 'var(--fg)',
              outline: 'none', boxSizing: 'border-box',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)',
            }}
            onFocus={(e) => { e.target.style.borderColor = catInfo.color; e.target.style.boxShadow = `0 0 0 4px ${catInfo.bgColor}, 0 8px 24px rgba(0,0,0,0.06)`; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--line-strong)'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)'; }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'var(--line)', border: 'none', width: 28, height: 28, borderRadius: 14, cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Query hints / example chips */}
        {!query && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)', alignSelf: 'center' }}>예시 →</span>
            {['기능성 AND 자외선', '천연화장품 OR 유기농', '표시기준', '맞춤형화장품 판매업'].map(ex => (
              <button key={ex} onClick={() => setQuery(ex)} style={{ padding: '5px 10px', fontSize: 12 * fontScale, fontFamily: 'var(--ff-mono)', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 999, cursor: 'pointer', color: 'var(--fg-sub)' }}>{ex}</button>
            ))}
          </div>
        )}

        {/* Parsed query indicator */}
        {parsed.terms.length > 0 && (
          <div style={{ marginTop: 18, padding: '10px 14px', background: 'var(--accent-bg)', borderRadius: 8, fontSize: 12 * fontScale, color: 'var(--accent)', fontFamily: 'var(--ff-mono)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ opacity: 0.7 }}>{parsed.extracted ? '자연어에서 추출된 키워드' : '검색 키워드'} · {parsed.op}</span>
            {parsed.terms.map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.7)', padding: '2px 7px', borderRadius: 3, color: 'var(--fg)' }}>{t}</span>)}
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
          <div style={{ fontSize: 12.5 * fontScale, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }}>
            {query ? (<><b style={{ color: 'var(--fg)' }}>{searchResult.results.length}</b>건 · 관련도순</>) : <>전체 {searchResult.results.length}건</>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? 'var(--fg)' : 'var(--bg-sub)', color: showFilters ? 'var(--bg)' : 'var(--fg-sub)', border: '1px solid var(--line-strong)', padding: '6px 12px', borderRadius: 6, fontSize: 12 * fontScale, cursor: 'pointer', fontFamily: 'var(--ff-sans)', display: 'flex', alignItems: 'center', gap: 6 }}>
            필터
            {(filters.sources?.length || filters.chapters?.length) ? (
              <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontFamily: 'var(--ff-mono)' }}>
                {(filters.sources?.length || 0) + (filters.chapters?.length || 0)}
              </span>
            ) : null}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{ marginTop: 10, padding: '16px 18px', background: 'var(--bg-sub)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <FilterGroup label="출처" items={sources.map(s => ({ key: s.key, label: shortSourceB(s.key), count: s.count }))} selected={filters.sources || []} onToggle={(key) => setFilters({ ...filters, sources: toggleArrB(filters.sources || [], key) })} fontScale={fontScale} />
            <FilterGroup label="장" items={chapters.map(c => ({ key: c.key, label: c.key, count: c.count }))} selected={filters.chapters || []} onToggle={(key) => setFilters({ ...filters, chapters: toggleArrB(filters.chapters || [], key) })} fontScale={fontScale} />
            {(filters.sources?.length || filters.chapters?.length) ? (
              <button onClick={() => setFilters({})} style={{ marginTop: 4, fontSize: 12 * fontScale, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>초기화</button>
            ) : null}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 32px 80px' }}>
        {searchResult.results.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>∅</div>
            <div style={{ fontSize: 15 * fontScale, color: 'var(--fg)' }}>
              {query ? '검색 결과가 없습니다' : '검색어를 입력해주세요'}
            </div>
          </div>
        ) : (
          searchResult.results.slice(0, 100).map(({ item, score }) => (
            <CardB
              key={item.id}
              item={item}
              score={score}
              terms={parsed.terms}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              pad={cardPad}
              fontScale={fontScale}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, items, selected, onToggle, fontScale }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {items.map(it => {
          const isSel = selected.includes(it.key);
          return (
            <button key={it.key} onClick={() => onToggle(it.key)} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12 * fontScale, background: isSel ? 'var(--accent)' : 'var(--bg)', color: isSel ? '#fff' : 'var(--fg-sub)', border: '1px solid ' + (isSel ? 'var(--accent)' : 'var(--line-strong)'), cursor: 'pointer', fontFamily: 'var(--ff-sans)' }}>
              {it.label} <span style={{ opacity: 0.7, marginLeft: 4, fontFamily: 'var(--ff-mono)' }}>{it.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardB({ item, score, terms, expanded, onToggle, pad, fontScale }) {
  const [copied, setCopied] = React.useState('');
  const copy = (e, text, label) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1200); };
  const download = (e) => {
    e.stopPropagation();
    const content = `[${item.qnum}] ${item.title}\n\n출처: ${item.sourceFile}\n문서번호: ${item.docNum}\n발행일: ${item.date}\n\n── 질문 ──\n${item.question}\n\n── 답변 ──\n${item.answer}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${item.qnum}.txt`; a.click(); URL.revokeObjectURL(url);
  };
  const hl = (text) => {
    const parts = window.QA.highlight(text || '', terms);
    return parts.map((s, i) => s.match ? <mark key={i} style={markB}>{s.text}</mark> : <React.Fragment key={i}>{s.text}</React.Fragment>);
  };
  const snippet = window.QA.snippet(item.answer || '', terms, 220);

  return (
    <div onClick={onToggle} style={{ padding: pad, cursor: 'pointer', borderBottom: '1px solid var(--line)', background: expanded ? 'var(--bg-active)' : 'transparent', transition: 'background 0.15s ease' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'var(--ff-mono)', fontSize: 11 * fontScale, color: 'var(--muted)', marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{item.qnum}</span>
        <span>·</span>
        <span>{shortSourceB(item.sourceFile)}</span>
        {item.chapter && <><span>·</span><span>{item.chapter}</span></>}
        {item.section && <><span>·</span><span>{item.section}</span></>}
      </div>
      <div style={{ fontSize: 17 * fontScale, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1.35, marginBottom: 8, color: 'var(--fg)' }}>
        {hl(item.title || '(제목 없음)')}
      </div>
      {!expanded ? (
        <div style={{ fontSize: 13.5 * fontScale, color: 'var(--fg-sub)', lineHeight: 1.6 }}>{hl(snippet)}</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10.5 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Question</div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px', fontSize: 14 * fontScale, lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{hl(item.question)}</div>
          <div style={{ fontSize: 10.5 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Answer</div>
          <div style={{ borderLeft: '3px solid var(--accent)', padding: '4px 0 4px 16px', fontSize: 14 * fontScale, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--fg)' }}>{hl(item.answer)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={(e) => copy(e, item.answer, 'a')} style={actionB}>답변 복사 {copied === 'a' && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>✓</span>}</button>
            <button onClick={(e) => copy(e, `[${item.qnum}] ${item.title}\n\nQ. ${item.question}\n\nA. ${item.answer}\n\n출처: ${item.sourceFile} (${item.date})`, 'all')} style={actionB}>전체 복사 {copied === 'all' && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>✓</span>}</button>
            <button onClick={download} style={actionB}>.txt 다운로드</button>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11 * fontScale, fontFamily: 'var(--ff-mono)', color: 'var(--muted)', alignSelf: 'center' }}>{item.docNum} · {item.date}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const markB = { background: 'var(--mark)', color: 'var(--mark-fg)', padding: '1px 2px', borderRadius: 2 };
const actionB = { padding: '6px 11px', fontSize: 12 * 1, fontFamily: 'var(--ff-sans)', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg)' };

function shortSourceB(s) {
  if (!s) return '';
  return s.replace('자주하는 질문집(화장품)', 'FAQ').replace('기능성화장품 심사 질의응답집', '기능성 심사');
}
function toggleArrB(arr, v) { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; }

window.VariationB = VariationB;
window.CategorySelect = CategorySelect;
