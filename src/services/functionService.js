import api from './api';

export async function getFunctionsByBuilding(buildingId) {
  try {
    const res = await api.get(`/buildings/${buildingId}/functions`);
    return Array.isArray(res) ? res : [];
  } catch (e) {
    // Mock fallback
    return [
      { function_id: 1, building_id: buildingId, name: 'Operations', description: 'Core ops and services' },
      { function_id: 2, building_id: buildingId, name: 'Finance', description: 'Billing and payments' },
      { function_id: 3, building_id: buildingId, name: 'HR', description: 'People and processes' },
    ];
  }
}

export async function getJobsByFunction(functionId) {
  try {
    const res = await api.get(`/functions/${functionId}/jobs`);
    return Array.isArray(res) ? res : [];
  } catch (e) {
    // Mock fallback
    const map = {
      1: [ { job_id: 11, function_id: 1, name: 'Customer Support' }, { job_id: 12, function_id: 1, name: 'Onboarding' } ],
      2: [ { job_id: 21, function_id: 2, name: 'Invoicing' } ],
      3: [ { job_id: 31, function_id: 3, name: 'Recruitment' }, { job_id: 32, function_id: 3, name: 'Performance Review' } ],
    };
    return map[functionId] || [];
  }
}

export async function getFunctionTree(buildingId) {
  const functions = await getFunctionsByBuilding(buildingId);
  const jobsLists = await Promise.all(functions.map(f => getJobsByFunction(f.function_id)));
  const byId = new Map(functions.map(f => [f.function_id, { ...f, jobs: [] }]));
  functions.forEach((f, idx) => {
    byId.get(f.function_id).jobs = jobsLists[idx];
  });
  return Array.from(byId.values());
}

// New: generic list for Function Management table
export async function getFunctions() {
  try {
    const res = await api.get('/functions');
    return Array.isArray(res) ? res : [];
  } catch (e) {
    // Mock fallback with required fields for the table
    return [
      { function_id: 101, function_code: 'OPS', name: 'Operations', company_name: 'HQ', parent_name: '-', parent_code: '-' },
      { function_id: 102, function_code: 'FIN', name: 'Finance', company_name: 'HQ', parent_name: '-', parent_code: '-' },
      { function_id: 103, function_code: 'HR',  name: 'Human Resources', company_name: 'HQ', parent_name: '-', parent_code: '-' },
      { function_id: 104, function_code: 'OPS-CS', name: 'Customer Support', company_name: 'HQ', parent_name: 'Operations', parent_code: 'OPS' },
    ];
  }
}

export async function getFunctionById(functionId) {
  try {
    const res = await api.get(`/functions/${functionId}`);
    return res || null;
  } catch (e) {
    // Mock lookup from fallback list
    const list = await getFunctions();
    return list.find(f => Number(f.function_id) === Number(functionId)) || null;
  }
}

export async function patchFunction(functionId, payload) {
  try {
    const res = await api.patch(`/functions/${functionId}`, payload);
    return res || payload;
  } catch (e) {
    // Mock optimistic update
    const existing = await getFunctionById(functionId);
    return { ...existing, ...payload };
  }
}

export async function createFunction(payload) {
  try {
    const res = await api.post('/functions', payload);
    return res;
  } catch (e) {
    // Mock create: assign a random id
    return { function_id: Math.floor(Math.random() * 100000), ...payload };
  }
}
