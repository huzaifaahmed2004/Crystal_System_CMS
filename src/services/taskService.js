import api from './api';

export async function getTasks() {
  return api.get('/task');
}

export async function getTaskById(id) {
  if (id == null) throw new Error('Task id is required');
  return api.get(`/task/${id}`);
}

export async function getTaskWithRelations(id) {
  if (id == null) throw new Error('Task id is required');
  try {
    // Preferred singular pattern
    const res = await api.get(`/task/${id}/with-relations`);
    return normalizeTaskRelations(res || null);
  } catch (e) {
    // Optional fallback if backend also supports a plural style
    try {
      const res2 = await api.get(`/tasks/with-relations?task_id=${encodeURIComponent(id)}`);
      const one = Array.isArray(res2) ? (res2[0] || null) : (res2 || null);
      return normalizeTaskRelations(one);
    } catch (err) {
      throw err;
    }
  }
}

// Normalize backend variations to a consistent shape for the UI
function normalizeTaskRelations(dto) {
  if (!dto || typeof dto !== 'object') return dto;
  const out = { ...dto };
  // Ensure taskSkills exists; map from task_skill if needed
  if (!Array.isArray(out.taskSkills) && Array.isArray(out.task_skill)) {
    out.taskSkills = out.task_skill.map((ts) => ({
      ...ts,
      // Ensure 'skill' object is present for UI access
      skill: ts?.skill || (ts?.skill_name ? { name: ts.skill_name, description: null } : undefined),
      // Map 'skill_level' -> 'level' for UI access
      level: ts?.level || ts?.skill_level || undefined,
    }));
  }
  return out;
}

export async function createTask(payload) {
  const body = {
    task_name: payload.task_name ?? payload.taskName ?? payload.name ?? '',
    task_code: payload.task_code ?? payload.taskCode ?? payload.code ?? '',
    task_company_id: payload.task_company_id ?? payload.company_id ?? payload.companyId ?? null,
    task_capacity_minutes: payload.task_capacity_minutes ?? payload.capacityMinutes ?? null,
    task_process_id: payload.task_process_id ?? payload.process_id ?? payload.processId ?? null,
    task_overview: payload.task_overview ?? payload.overview ?? '',
    // Optional: backend may accept array of job IDs during creation
    job_ids: Array.isArray(payload.job_ids) ? payload.job_ids : undefined,
    // Optional: pass through taskSkills if backend expects this key
    taskSkills: Array.isArray(payload.taskSkills) ? payload.taskSkills : undefined,
  };
  // Only include 'skills' when 'taskSkills' is not provided
  if (!Array.isArray(body.taskSkills)) {
    body.skills = Array.isArray(payload.skills)
      ? payload.skills
      : (Array.isArray(payload.taskSkills)
          ? payload.taskSkills.map(s => ({ name: s.skill_name ?? s.name, level: s.level }))
          : undefined);
  }
  return api.post('/task', body);
}

export async function updateTask(id, payload) {
  if (id == null) throw new Error('Task id is required');
  const body = {
    task_name: payload.task_name ?? payload.taskName ?? payload.name,
    task_code: payload.task_code ?? payload.taskCode ?? payload.code,
    task_company_id: payload.task_company_id ?? payload.company_id ?? payload.companyId,
    task_capacity_minutes: payload.task_capacity_minutes ?? payload.capacityMinutes,
    task_process_id: payload.task_process_id ?? payload.process_id ?? payload.processId,
    task_overview: payload.task_overview ?? payload.overview,
    // Optional: backend may accept array of job IDs on update
    job_ids: Array.isArray(payload.job_ids) ? payload.job_ids : undefined,
    // Optional passthrough for backends that expect taskSkills key
    taskSkills: Array.isArray(payload.taskSkills) ? payload.taskSkills : undefined,
  };
  // Only include 'skills' when 'taskSkills' is not provided
  if (!Array.isArray(body.taskSkills)) {
    body.skills = Array.isArray(payload.skills)
      ? payload.skills
      : (Array.isArray(payload.taskSkills)
          ? payload.taskSkills.map(s => ({ name: s.skill_name ?? s.name, level: s.level }))
          : undefined);
  }
  return api.patch(`/task/${id}`, body);
}

export async function deleteTask(id) {
  if (id == null) throw new Error('Task id is required');
  return api.delete(`/task/${id}`);
}

// Associate a job to a task
export async function addJobToTask(taskId, jobId) {
  if (taskId == null || jobId == null) throw new Error('Task ID and Job ID are required');
  // Prefer a dedicated association endpoint if available
  try {
    return await api.post(`/task/${taskId}/jobs`, { job_id: Number(jobId) });
  } catch (_) {
    // Fallback to a generic mapping endpoint
    return await api.post(`/task-job`, { task_id: Number(taskId), job_id: Number(jobId) });
  }
}

// Remove a job association from a task
export async function removeJobFromTask(taskId, jobId) {
  if (taskId == null || jobId == null) throw new Error('Task ID and Job ID are required');
  try {
    return await api.delete(`/task/${taskId}/jobs/${jobId}`);
  } catch (_) {
    // Fallback using query params if REST style not available
    return await api.delete(`/task-job?task_id=${encodeURIComponent(taskId)}&job_id=${encodeURIComponent(jobId)}`);
  }
}
