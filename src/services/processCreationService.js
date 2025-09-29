import api from './api';

// Base URL for Process Creation service
// Configure in .env.local: REACT_APP_Create_Process_URL
const CREATE_BASE_URL = process.env.REACT_APP_Create_Process_URL || '';
const Visualization_BASE_URL = process.env.REACT_APP_Visualize_Process_URL || '';
// POST /processcreation
// body: { query: string }

// POST /processsequence/image?format=png
// input: { process_name: string, tasks: string[] }
// returns: object URL to PNG image rendering the task sequence
export async function getProcessSequenceImage(body, format = 'png') {
  const endpoint = `${Visualization_BASE_URL}/processsequence/image?format=${encodeURIComponent(format || 'png')}`;
  let token = null;
  try {
    const raw = sessionStorage.getItem('auth');
    if (raw) token = JSON.parse(raw)?.accessToken || null;
  } catch (_) {}
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'image/png,*/*',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
// returns: { name: string, description: string }
export async function createProcessFromQuery(query) {
  const q = (query || '').trim();
  if (!q) throw new Error('Query is required');
  const endpoint = `${CREATE_BASE_URL}/processcreation`;
  const payload = { query: q };
  return api.post(endpoint, payload);
}

// POST /processtasks
// body: { name: string, description: string }
// returns: { task_names: string[], tasks: [{ name, description }] }
export async function createProcessTasks(name, description) {
  const n = (name || '').trim();
  const d = (description || '').trim();
  if (!n || !d) throw new Error('Name and description are required');
  const endpoint = `${CREATE_BASE_URL}/processtasks`;
  const payload = { name: n, description: d };
  return api.post(endpoint, payload);
}

// POST /taskjobs
// input shape:
// {
//   process_name: string,
//   process_description: string,
//   tasks: [{ name: string, description: string }]
// }
// returns: { jobs: [{ name, description, task_indices: number[] }] }
export async function createTaskJobs(body) {
  const endpoint = `${CREATE_BASE_URL}/taskjobs`;
  const safe = body || {};
  return api.post(endpoint, safe);
}

// POST /jobfunctions
// input shape:
// {
//   process_name: string,
//   process_description: string,
//   tasks: [{ name: string, description: string }],
//   jobs: [{ name: string, description: string, task_indices: number[] }]
// }
// returns: { functions: [{ name, description, job_indices: number[] }] }
export async function createJobFunctions(body) {
  const endpoint = `${CREATE_BASE_URL}/jobfunctions`;
  const safe = body || {};
  return api.post(endpoint, safe);
}

// POST /processgraph/image?format=png
// input shape matches the provided structure combining process_name, tasks, jobs, functions
// returns: an object URL to a PNG image for visualization
export async function getProcessGraphImage(body, format = 'png') {
  const endpoint = `${Visualization_BASE_URL}/processgraph/image?format=${encodeURIComponent(format || 'png')}`;
  // Build auth header similar to other services
  let token = null;
  try {
    const raw = sessionStorage.getItem('auth');
    if (raw) token = JSON.parse(raw)?.accessToken || null;
  } catch (_) {}
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'image/png,*/*',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
