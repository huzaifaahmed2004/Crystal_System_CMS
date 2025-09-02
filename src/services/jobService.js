import api from './api';

// Jobs service
export const getJobs = async () => {
  const res = await api.get('/job');
  return Array.isArray(res) ? res : [];
};

export const updateJob = async (id, payload) => {
  if (!id) throw new Error('Job id is required');
  const body = {
    jobCode: String(payload.jobCode || payload.job_code || '').trim(),
    name: String(payload.name || '').trim(),
    description: String(payload.description || ''),
    function_id: payload.function_id != null ? Number(payload.function_id) : null,
    company_id: payload.company_id != null ? Number(payload.company_id) : null,
    hourlyRate: payload.hourlyRate != null ? Number(payload.hourlyRate) : null,
    maxHoursPerDay: payload.maxHoursPerDay != null ? Number(payload.maxHoursPerDay) : null,
    jobLevel: payload.jobLevel || payload.job_level_name || '',
    skills: Array.isArray(payload.skills) ? payload.skills : [],
  };
  return api.patch(`/job/${id}`, body);
};

export const createJob = async (payload) => {
  const body = {
    jobCode: String(payload.jobCode || payload.job_code || '').trim(),
    name: String(payload.name || '').trim(),
    description: String(payload.description || ''),
    function_id: payload.function_id != null ? Number(payload.function_id) : null,
    company_id: payload.company_id != null ? Number(payload.company_id) : null,
    hourlyRate: payload.hourlyRate != null ? Number(payload.hourlyRate) : null,
    maxHoursPerDay: payload.maxHoursPerDay != null ? Number(payload.maxHoursPerDay) : null,
    // API schema requires string level and simplified skills
    jobLevel: payload.jobLevel || payload.job_level_name || '',
    skills: Array.isArray(payload.skills) ? payload.skills : [],
  };
  const res = await api.post('/job', body);
  return res;
};

export const deleteJob = async (id) => {
  if (!id) throw new Error('Job id is required');
  return api.delete(`/job/${id}`);
};

export const getJobWithRelations = async (id) => {
  if (!id) throw new Error('Job id is required');
  // Backend may return array for with-relations; try common patterns
  try {
    // Query param style
    const res = await api.get(`/jobs/with-relations?job_id=${encodeURIComponent(id)}`);
    if (Array.isArray(res)) return res[0] || null;
    return res || null;
  } catch (_) {
    try {
      // Path param style
      const res2 = await api.get(`/job/${id}/with-relations`);
      if (Array.isArray(res2)) return res2[0] || null;
      return res2 || null;
    } catch (e) {
      throw e;
    }
  }
};
