// Service to call Process Optimization PNG endpoints
// Base URL comes from REACT_APP_PROCESS_OPT_BASE_URL

const BASE_URL = process.env.REACT_APP_PROCESS_OPT_BASE_URL || '';

function buildHeaders(extra = {}) {
  let token = null;
  try {
    const raw = sessionStorage.getItem('auth');
    if (raw) token = JSON.parse(raw)?.accessToken || null;
  } catch (_) {}
  return {
    Accept: 'image/png,*/*',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function postPng(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  return objectUrl;
}

export async function getAllocPng(processId) {
  if (!processId) throw new Error('processId is required');
  return postPng(`/cms/optimize/${encodeURIComponent(processId)}/alloc_png`);
}

export async function getSummaryPng(processId) {
  if (!processId) throw new Error('processId is required');
  return postPng(`/cms/optimize/${encodeURIComponent(processId)}/summary_png`);
}
