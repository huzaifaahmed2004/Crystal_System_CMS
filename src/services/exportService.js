import api from './api';

// Request an export for one or more process IDs.
// Returns an absolute download URL string.
export async function exportProcesses(ids) {
  const arr = Array.isArray(ids) ? ids : (ids != null ? [ids] : []);
  if (arr.length === 0) throw new Error('No processes selected');
  const payload = arr.length === 1 ? { id: arr[0] } : { ids: arr };
  const res = await api.post('/export', payload);
  if (!res || typeof res !== 'object') throw new Error('Invalid export response');
  const link = res.url || res.link || res.downloadUrl || res.downloadURL || res.download_link || res.file || res.href;
  if (!link || typeof link !== 'string') throw new Error('No download link returned');
  const base = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL || '';
  const absolute = /^https?:\/\//i.test(link) ? link : `${base}${link}`;
  return absolute;
}

export default { exportProcesses };
