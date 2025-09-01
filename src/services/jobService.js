import api from './api';

// Jobs service
export const getJobs = async () => {
  const res = await api.get('/job');
  return Array.isArray(res) ? res : [];
};

export const deleteJob = async (id) => {
  if (!id) throw new Error('Job id is required');
  return api.delete(`/job/${id}`);
};
