import api from './api';

// Create a table in a room
// body: { tableCode, name, room_id, capacity, orientation }
export async function createTable(body) {
  const payload = {
    tableCode: String(body.tableCode || '').trim(),
    name: String(body.name || '').trim(),
    room_id: Number(body.room_id),
    capacity: Number(body.capacity) || 0,
    orientation: String(body.orientation || '').toUpperCase(),
  };
  const res = await api.post('/table', payload);
  return res || { id: Math.floor(Math.random() * 1000000), ...payload };
}

// Delete a table by id
export async function deleteTable(tableId) {
  return api.delete(`/table/${tableId}`);
}

// Assign a job to a table
// POST /table/{tableId}/jobs with body { job_id }
export async function addTableJob(tableId, jobId) {
  if (!tableId) throw new Error('tableId is required');
  if (!jobId) throw new Error('jobId is required');
  return api.post(`/table/${tableId}/jobs`, { job_id: Number(jobId) });
}

// Delete a job assignment from a table
// DELETE /table/{tableId}/jobs/{jobId}
export async function deleteTableJob(tableId, jobId) {
  if (!tableId) throw new Error('tableId is required');
  if (!jobId) throw new Error('jobId is required');
  return api.delete(`/table/${tableId}/jobs/${jobId}`);
}

// Get existing job assignments for a table
// GET /table/{tableId}/jobs -> array of { table_id, job_id, ... }
export async function getTableJobs(tableId) {
  if (!tableId) throw new Error('tableId is required');
  const res = await api.get(`/table/${tableId}/jobs`);
  return Array.isArray(res) ? res : [];
}

// Get all tables with relations (including tableJobs)
export async function getTablesWithRelations() {
  const res = await api.get('/table/with-relations');
  return Array.isArray(res) ? res : [];
}
