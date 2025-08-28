import api from './api';

// Building service (singular endpoints)
// Endpoints:
// - GET /building
// - GET /building/:id
// - POST /building
// - PATCH /building/:id
// - DELETE /building/:id

const normalizeBuilding = (dto) => ({
  building_id: dto?.building_id ?? dto?.id,
  name: dto?.name ?? '',
  company_id: dto?.company_id ?? null,
  country: dto?.country ?? '',
  city: dto?.city ?? '',
  rows: dto?.rows ?? 0,
  columns: dto?.columns ?? 0,
  floors: dto?.floors ?? 0,
});

export async function getBuildings() {
  try {
    const data = await api.get('/building');
    return Array.isArray(data) ? data.map(normalizeBuilding) : [];
  } catch (e) {
    console.warn('Falling back to mock buildings due to API error');
    return [
      { building_id: 101, name: 'HQ', company_id: 1, country: 'USA', city: 'San Jose', rows: 10, columns: 12, floors: 5 },
      { building_id: 102, name: 'Plant A', company_id: 2, country: 'USA', city: 'Fremont', rows: 20, columns: 20, floors: 3 },
    ];
  }
}

export async function getBuildingById(id) {
  const res = await api.get(`/building/${id}`);
  return res ? normalizeBuilding(res) : null;
}

export async function createBuilding(payload) {
  const body = {
    building_id: Number(payload.building_id),
    name: String(payload.name || '').trim(),
    company_id: payload.company_id != null ? Number(payload.company_id) : null,
    country: String(payload.country || '').trim(),
    city: String(payload.city || '').trim(),
    rows: Number(payload.rows) || 0,
    columns: Number(payload.columns) || 0,
    floors: Number(payload.floors) || 0,
  };
  const res = await api.post('/building', body);
  return res ? normalizeBuilding(res) : normalizeBuilding(body);
}

export async function patchBuilding(id, payload) {
  const body = {};
  if (payload.name !== undefined) body.name = String(payload.name).trim();
  if (payload.company_id !== undefined) body.company_id = Number(payload.company_id);
  if (payload.country !== undefined) body.country = String(payload.country).trim();
  if (payload.city !== undefined) body.city = String(payload.city).trim();
  if (payload.rows !== undefined) body.rows = Number(payload.rows) || 0;
  if (payload.columns !== undefined) body.columns = Number(payload.columns) || 0;
  if (payload.floors !== undefined) body.floors = Number(payload.floors) || 0;
  if (payload.building_id !== undefined && Number(payload.building_id) !== Number(id)) body.id = Number(payload.building_id);
  const res = await api.patch(`/building/${id}`, body);
  return res ? normalizeBuilding(res) : normalizeBuilding({ id: body.id ?? id, ...body });
}

export async function deleteBuilding(id) {
  return api.delete(`/building/${id}`);
}

export async function deleteBuildingsBulk(ids = []) {
  await Promise.all(ids.map((i) => deleteBuilding(i)));
}
