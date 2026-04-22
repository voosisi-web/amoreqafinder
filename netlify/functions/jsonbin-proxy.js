exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'POST만 지원합니다.' }) };
  }

  const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
  const DEFAULT_QA_BIN_ID = process.env.JSONBIN_QA_BIN_ID || '';
  const DEFAULT_IDS_BIN_ID = process.env.JSONBIN_IDS_BIN_ID || '';
  const DEFAULT_COLLECTION_ID = process.env.JSONBIN_COLLECTION_ID || '';
  const BASE = 'https://api.jsonbin.io/v3/b';

  const reply = (statusCode, payload) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(payload) });

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return reply(400, { ok: false, error: 'JSON 본문 형식이 올바르지 않습니다.' });
  }

  const action = body.action || '';

  if (action === 'get-config') {
    return reply(200, {
      ok: true,
      config: {
        qaBinId: DEFAULT_QA_BIN_ID,
        idsBinId: DEFAULT_IDS_BIN_ID,
        autoLoad: !!DEFAULT_QA_BIN_ID,
        writeEnabled: !!MASTER_KEY,
      },
    });
  }

  if (!MASTER_KEY) {
    return reply(500, { ok: false, error: 'Netlify 환경변수 JSONBIN_MASTER_KEY가 설정되지 않았습니다.' });
  }

  const type = body.type === 'ids' ? 'ids' : 'qa';
  const fallbackBinId = type === 'ids' ? DEFAULT_IDS_BIN_ID : DEFAULT_QA_BIN_ID;
  const binId = String(body.binId || fallbackBinId || '').trim();

  const fetchJsonbin = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-Master-Key': MASTER_KEY,
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok) {
      const errorText = json?.message || json?.error || text || `JSONBin 오류 ${res.status}`;
      throw new Error(errorText);
    }
    return json;
  };

  try {
    if (action === 'read') {
      if (!binId) return reply(400, { ok: false, error: 'binId가 필요합니다.' });
      const json = await fetchJsonbin(`${BASE}/${binId}/latest`, {
        method: 'GET',
        headers: { 'X-Bin-Meta': 'false' },
      });
      return reply(200, { ok: true, record: json?.record ?? json ?? null });
    }

    if (action === 'write') {
      if (!binId) return reply(400, { ok: false, error: 'binId가 필요합니다.' });
      await fetchJsonbin(`${BASE}/${binId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.data),
      });
      return reply(200, { ok: true, binId, updated: true });
    }

    if (action === 'create') {
      const name = String(body.name || `${type}-data`).trim() || `${type}-data`;
      const json = await fetchJsonbin(BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bin-Name': name,
          'X-Bin-Private': 'true',
          ...(DEFAULT_COLLECTION_ID ? { 'X-Collection-Id': DEFAULT_COLLECTION_ID } : {}),
        },
        body: JSON.stringify(body.data),
      });
      return reply(200, { ok: true, binId: json?.metadata?.id || '' });
    }


    if (action === 'delete') {
      if (!binId) return reply(400, { ok: false, error: 'binId가 필요합니다.' });
      const emptyData = [];
      await fetchJsonbin(`${BASE}/${binId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyData),
      });
      return reply(200, { ok: true, binId, deleted: true, type });
    }

    if (action === 'health') {
      return reply(200, { ok: true, hasMasterKey: true, qaBinId: !!DEFAULT_QA_BIN_ID, idsBinId: !!DEFAULT_IDS_BIN_ID });
    }

    return reply(400, { ok: false, error: '지원하지 않는 action 입니다.' });
  } catch (error) {
    return reply(500, { ok: false, error: error.message || '서버 처리 중 오류가 발생했습니다.' });
  }
};
