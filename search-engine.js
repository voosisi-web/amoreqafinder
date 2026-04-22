// search-engine.js — keyword search for cosmetics Q&A
// Supports: single keyword, AND/OR boolean queries, natural-language token extraction

(function() {
  // Korean stopwords (particles, common words) to filter from natural-language queries
  const STOPWORDS = new Set([
    '은','는','이','가','을','를','의','에','와','과','도','로','으로','에서','부터','까지',
    '이다','있다','없다','하다','되다','같다','그리고','그런데','그래서','하지만','또는','혹은',
    '어떻게','무엇','언제','어디','누가','왜','어떤','어떠한','관한','대한','관련','대해',
    '해야','하나요','인가요','있나요','있을','수','있습니까','입니까','까요','나요','까','요',
    'a','an','the','and','or','is','are','to','of','in','on','for','with','by','at','not',
  ]);

  // Tokenize a query into meaningful keywords
  // - splits on whitespace and punctuation
  // - removes stopwords
  // - keeps tokens length >= 2
  function tokenize(q) {
    if (!q) return [];
    return q
      .toLowerCase()
      .replace(/[?,.!;:()[\]{}·•""''`~@#$%^&*+=<>\\/|]/g, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length >= 2 && !STOPWORDS.has(t));
  }

  // Parse a boolean query into terms + operator.
  // Supports: "a AND b", "a OR b", "a b" (default AND)
  // Returns {terms: string[], op: 'AND'|'OR'}
  function parseQuery(q) {
    if (!q) return { terms: [], op: 'AND', raw: '' };
    const trimmed = q.trim();
    // Detect OR (case-insensitive, standalone)
    if (/\s(OR|or|\|\|)\s/.test(trimmed)) {
      const terms = trimmed.split(/\s+(?:OR|or|\|\|)\s+/).map(t => t.replace(/\s+AND\s+/gi,' ').trim()).filter(Boolean);
      return { terms, op: 'OR', raw: q };
    }
    // Detect AND
    if (/\s(AND|and|&&)\s/.test(trimmed)) {
      const terms = trimmed.split(/\s+(?:AND|and|&&)\s+/).map(t => t.trim()).filter(Boolean);
      return { terms, op: 'AND', raw: q };
    }
    // No operator — if sentence-like (>= 4 tokens / has ? / has Korean verb ending), tokenize
    const looksNatural = /[?？]/.test(trimmed) || /(나요|까요|인가요|있나요|하나요|할까요|됩니까|입니까)$/.test(trimmed) || trimmed.split(/\s+/).length >= 4;
    if (looksNatural) {
      const tokens = tokenize(trimmed);
      return { terms: tokens, op: 'AND', raw: q, extracted: true };
    }
    // Single term or space-separated few terms — AND
    const terms = trimmed.split(/\s+/).map(t => t.trim()).filter(Boolean);
    return { terms, op: 'AND', raw: q };
  }

  // Score a single item against terms
  // Field weights: title 5, section 3, chapter 2, question 3, answer 1, qnum 2
  function scoreItem(item, terms, op) {
    if (!terms.length) return 0;
    const fields = [
      { text: (item.title||'').toLowerCase(), w: 5 },
      { text: (item.section||'').toLowerCase(), w: 3 },
      { text: (item.chapter||'').toLowerCase(), w: 2 },
      { text: (item.question||'').toLowerCase(), w: 3 },
      { text: (item.answer||'').toLowerCase(), w: 1 },
      { text: (item.qnum||'').toLowerCase(), w: 2 },
    ];
    let totalScore = 0;
    let matchedTerms = 0;
    for (const term of terms) {
      const t = term.toLowerCase();
      let termScore = 0;
      for (const f of fields) {
        if (!f.text) continue;
        // Count occurrences (simple substring)
        let idx = 0, count = 0;
        while ((idx = f.text.indexOf(t, idx)) !== -1) { count++; idx += t.length; }
        if (count > 0) termScore += count * f.w;
      }
      if (termScore > 0) {
        matchedTerms++;
        totalScore += termScore;
      }
    }
    if (op === 'AND' && matchedTerms < terms.length) return 0;
    if (op === 'OR' && matchedTerms === 0) return 0;
    // Bonus for matching more terms
    totalScore *= (1 + matchedTerms * 0.2);
    return totalScore;
  }

  // Main search function
  function search(items, query, filters = {}) {
    const parsed = parseQuery(query);
    let pool = items;
    if (filters.years && filters.years.length) {
      pool = pool.filter(i => filters.years.includes(i.year));
    }
    if (filters.sources && filters.sources.length) {
      pool = pool.filter(i => filters.sources.includes(i.sourceFile));
    }
    if (filters.chapters && filters.chapters.length) {
      pool = pool.filter(i => filters.chapters.includes(i.chapter));
    }
    if (!parsed.terms.length) {
      return { parsed, results: pool.map(item => ({ item, score: 0 })) };
    }
    const scored = [];
    for (const item of pool) {
      const score = scoreItem(item, parsed.terms, parsed.op);
      if (score > 0) scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return { parsed, results: scored };
  }

  // Highlight matched terms in text — returns array of {text, match} segments
  function highlight(text, terms) {
    if (!text || !terms || !terms.length) return [{ text, match: false }];
    const lower = text.toLowerCase();
    const hits = [];
    for (const term of terms) {
      const t = term.toLowerCase();
      if (!t) continue;
      let idx = 0;
      while ((idx = lower.indexOf(t, idx)) !== -1) {
        hits.push({ start: idx, end: idx + t.length });
        idx += t.length;
      }
    }
    if (!hits.length) return [{ text, match: false }];
    hits.sort((a, b) => a.start - b.start);
    // Merge overlapping
    const merged = [hits[0]];
    for (let i = 1; i < hits.length; i++) {
      const last = merged[merged.length-1];
      if (hits[i].start <= last.end) last.end = Math.max(last.end, hits[i].end);
      else merged.push(hits[i]);
    }
    const out = [];
    let cursor = 0;
    for (const h of merged) {
      if (h.start > cursor) out.push({ text: text.slice(cursor, h.start), match: false });
      out.push({ text: text.slice(h.start, h.end), match: true });
      cursor = h.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), match: false });
    return out;
  }

  // Snippet: find first match in long text and return surrounding context
  function snippet(text, terms, maxLen = 200) {
    if (!text) return '';
    if (!terms || !terms.length) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');
    const lower = text.toLowerCase();
    let firstHit = -1;
    for (const term of terms) {
      const t = term.toLowerCase();
      if (!t) continue;
      const idx = lower.indexOf(t);
      if (idx !== -1 && (firstHit === -1 || idx < firstHit)) firstHit = idx;
    }
    if (firstHit === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');
    const start = Math.max(0, firstHit - 60);
    const end = Math.min(text.length, start + maxLen);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < text.length ? '…' : '';
    return prefix + text.slice(start, end) + suffix;
  }

  window.QA = { parseQuery, search, highlight, snippet, tokenize };
})();
