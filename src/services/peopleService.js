import api from './api';

export const getPeople = async () => {
  return await api.get('/people');
};

export const getPersonById = async (id) => {
  if (id == null) throw new Error('id is required');
  return await api.get(`/people/${id}`);
};

export const createPerson = async (payload) => {
  // expects: { name, surname, email, phone, is_manager, company_id, job_id }
  return await api.post('/people', payload);
};

export const updatePerson = async (id, payload) => {
  if (id == null) throw new Error('id is required');
  return await api.patch(`/people/${id}`, payload);
};

export const deletePerson = async (id) => {
  if (id == null) throw new Error('id is required');
  return await api.delete(`/people/${id}`);
};

export default {
  getPeople,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
};
