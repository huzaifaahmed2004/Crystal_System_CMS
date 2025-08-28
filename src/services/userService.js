import api from './api';

// User service using backend endpoints (excluding the last two with-relations)
// GET    /user                 -> [{ user_id, name, email, password?, role_id }]
// GET    /user/:id             -> { user_id, name, email, password?, role_id }
// POST   /user                 -> { user_id, name, email, role_id }
// PATCH  /user/:id             -> updated user
// DELETE /user/:id             -> { ok: true }

// Normalize API payloads to ensure consistent 'email' and 'name' keys
const normalizeUser = (u) => {
  if (!u || typeof u !== 'object') return u;
  const email = (u.email ?? u.emai ?? u.user_email ?? '');
  const name = (u.name ?? u.username ?? u.full_name ?? u.user_name ?? '');
  return { ...u, email, name };
};

export async function getUsers() {
  const res = await api.get('/user');
  const arr = Array.isArray(res) ? res : [];
  return arr.map(normalizeUser);
}

export async function getUserById(userId) {
  if (userId === undefined || userId === null || userId === '') throw new Error('userId is required');
  const idNum = Number(userId);
  if (!Number.isInteger(idNum)) throw new Error('userId must be an integer');
  const data = await api.get(`/user/${idNum}`);
  return normalizeUser(data);
}

export async function createUser(payload) {
  // payload (from UI): { user_id, name, email, password, role_id }
  // backend expects 'username' instead of 'name'; include user_id (non-autoincrement PK)
  const uid = Number(payload.user_id);
  if (!Number.isInteger(uid)) throw new Error('user_id must be an integer');
  const body = {
    user_id: uid,
    username: payload.username ?? payload.name,
    email: payload.email,
    password: payload.password,
    role_id: payload.role_id,
  };
  return api.post('/user', body);
}

export async function patchUser(userId, payload) {
  const idNum = Number(userId);
  if (!Number.isInteger(idNum)) throw new Error('userId must be an integer');
  const body = { ...payload };
  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    body.username = body.name;
    delete body.name;
  }
  // Do NOT send the id in the body; backend expects it only in the URL
  delete body.user_id;
  delete body.id;
  return api.patch(`/user/${idNum}`, body);
}

export async function deleteUser(userId) {
  const idNum = Number(userId);
  if (!Number.isInteger(idNum)) throw new Error('userId must be an integer');
  return api.delete(`/user/${idNum}`);
}
