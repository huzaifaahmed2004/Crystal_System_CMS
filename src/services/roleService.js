import api from './api';

// Role service using backend endpoints
// Standard CRUD endpoints:
// GET    /role                   -> [{ role_id, name, description }]
// GET    /role/:id               -> { role_id, name, description }
// POST   /role                   -> { role_id, name, description }
// PATCH  /role/:id               -> { role_id, name, description }
// DELETE /role/:id               -> { ok: true }

export async function getRoles() {
  const roles = await api.get('/role');
  return Array.isArray(roles) ? roles : [];
}

export async function getRoleById(roleId) {
  if (roleId === undefined || roleId === null || roleId === '') throw new Error('roleId is required');
  const idNum = Number(roleId);
  if (!Number.isInteger(idNum)) throw new Error('roleId must be an integer');
  return api.get(`/role/${idNum}`);
}

export async function createRole(payload) {
  // payload: { name, description }
  // Backend now auto-increments role_id; do not send id in body
  const body = { name: payload?.name, description: payload?.description };
  return api.post('/role', body);
}

export async function patchRole(roleId, payload) {
  const idNum = Number(roleId);
  if (!Number.isInteger(idNum)) throw new Error('roleId must be an integer');
  // Do NOT send the id in the body; backend expects it only in the URL
  const body = { ...(payload || {}) };
  delete body.role_id;
  delete body.id;
  return api.patch(`/role/${idNum}`, body);
}

export async function deleteRole(roleId) {
  const idNum = Number(roleId);
  if (!Number.isInteger(idNum)) throw new Error('roleId must be an integer');
  return api.delete(`/role/${idNum}`);
}

export async function deleteRolesBulk(ids = []) {
  const tasks = ids.map((id) => deleteRole(id));
  await Promise.all(tasks);
  return { ok: true };
}
