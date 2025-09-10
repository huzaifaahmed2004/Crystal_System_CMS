import api from './api';

export async function getProcesses() {
  return api.get('/process');
}

export async function getProcessesWithRelations() {
  try {
    const data = await api.get('/process/with-relations');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to load /process/with-relations', e);
    return [];
  }
}

export async function updateProcess(id, payload) {
  if (id == null) throw new Error('Process id is required');
  const body = {
    process_name: String(payload.process_name || payload.name || '').trim(),
    process_code: String(payload.process_code || payload.code || '').trim(),
    company_id: payload.company_id != null ? Number(payload.company_id) : null,
    process_overview: String(payload.process_overview || payload.overview || ''),
    workflow: Array.isArray(payload.workflow)
      ? payload.workflow.map((w, idx) => ({
          task_id: w?.task_id != null ? Number(w.task_id) : null,
          job_id: w?.job_id != null ? Number(w.job_id) : null,
          order: w?.order != null ? Number(w.order) : (idx + 1),
        }))
      : [],
  };
  return api.patch(`/process/${id}`, body);
}

export async function deleteProcess(id) {
  if (id == null) throw new Error('Process id is required');
  return api.delete(`/process/${id}`);
}

export async function getProcessWithRelations(id) {
  if (id == null) throw new Error('Process id is required');
  return api.get(`/process/${id}/with-relations`);
}

export async function createProcess(payload) {
  // Build body according to provided schema
  const body = {
    process_name: String(payload.process_name || payload.name || '').trim(),
    process_code: String(payload.process_code || payload.code || '').trim(),
    company_id: payload.company_id != null ? Number(payload.company_id) : null,
    process_overview: String(payload.process_overview || payload.overview || ''),
    workflow: Array.isArray(payload.workflow)
      ? payload.workflow.map(w => ({
          task_id: w?.task_id != null ? Number(w.task_id) : null,
          job_id: w?.job_id != null ? Number(w.job_id) : null,
          order: w?.order != null ? Number(w.order) : null,
        }))
      : [],
  };
  return api.post('/process', body);
}
