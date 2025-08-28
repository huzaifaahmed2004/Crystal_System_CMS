
import api from './api';

// Auth service for login/logout
// POST /auth/login -> { access_token, user }
export async function login(email, password) {
  if (!email || !password) throw new Error('Email and password are required');
  const res = await api.post('/auth/login', { email, password });
  if (!res || !res.access_token || !res.user) {
    throw new Error('Invalid login response');
  }
  return res; // { access_token, user }
}
