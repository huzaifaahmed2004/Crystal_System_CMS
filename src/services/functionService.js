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
