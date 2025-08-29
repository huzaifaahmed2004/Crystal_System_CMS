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
  building_code: dto?.building_code ?? dto?.code ?? '',
  name: dto?.name ?? '',
  company_id: dto?.company_id ?? null,
  country: dto?.country ?? '',
  city: dto?.city ?? '',
  rows: dto?.rows ?? 0,
  columns: dto?.columns ?? 0,
  floors: dto?.floors ?? 0,
  // Optional layout markers if provided by backend
  stairs_cell: dto?.stairs_cell ?? null,
  elevator_cell: dto?.elevator_cell ?? null,
});

export async function getBuildings() {
  try {
    const data = await api.get('/building');
    const list = Array.isArray(data) ? data.map(normalizeBuilding) : [];
    if (list.length > 0) return list;
    // Fall back to mocks if API returns empty
    return [
      { building_id: 101, building_code: 'HQ-101', name: 'HQ', company_id: 1, country: 'USA', city: 'San Jose', rows: 5, columns: 10, floors: 3, stairs_cell: 5, elevator_cell: 15 },
      { building_id: 102, building_code: 'PLANT-A', name: 'Plant A', company_id: 2, country: 'USA', city: 'Fremont', rows: 4, columns: 8, floors: 2, stairs_cell: 8, elevator_cell: 16 },
    ];
  } catch (e) {
    console.warn('Falling back to mock buildings due to API error');
    return [
      // Include optional layout markers so FloorDetailPage can reserve cells locally without API
      { building_id: 101, building_code: 'HQ-101', name: 'HQ', company_id: 1, country: 'USA', city: 'San Jose', rows: 5, columns: 10, floors: 3, stairs_cell: 5, elevator_cell: 15 },
      { building_id: 102, building_code: 'PLANT-A', name: 'Plant A', company_id: 2, country: 'USA', city: 'Fremont', rows: 4, columns: 8, floors: 2, stairs_cell: 8, elevator_cell: 16 },
    ];
  }
}

export async function getBuildingById(id) {
  const res = await api.get(`/building/${id}`);
  return res ? normalizeBuilding(res) : null;
}

export async function createBuilding(payload) {
  const body = {
    name: String(payload.name || '').trim(),
    company_id: payload.company_id != null ? Number(payload.company_id) : null,
    country: String(payload.country || '').trim(),
    city: String(payload.city || '').trim(),
    rows: Number(payload.rows) || 0,
    columns: Number(payload.columns) || 0,
    floors: Number(payload.floors) || 0,
  };
  if (payload.building_id !== undefined && payload.building_id !== null && payload.building_id !== '') {
    body.building_id = Number(payload.building_id);
  }
  if (payload.building_code !== undefined) {
    body.building_code = String(payload.building_code).trim();
  }
  try {
    const res = await api.post('/building', body);
    return res ? normalizeBuilding(res) : normalizeBuilding(body);
  } catch (e) {
    // Fallback to local object with a generated id when backend is unavailable
    const fallback = { id: body.building_id ?? Math.floor(Math.random() * 1000000), ...body };
    return normalizeBuilding(fallback);
  }
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
  if (payload.building_code !== undefined) body.building_code = String(payload.building_code).trim();
  // Optional layout markers for stairs/elevator cells
  if (payload.stairs_cell !== undefined) body.stairs_cell = payload.stairs_cell === null ? null : Number(payload.stairs_cell);
  if (payload.elevator_cell !== undefined) body.elevator_cell = payload.elevator_cell === null ? null : Number(payload.elevator_cell);
  if (payload.building_id !== undefined && Number(payload.building_id) !== Number(id)) body.id = Number(payload.building_id);
  try {
    const res = await api.patch(`/building/${id}`, body);
    return res ? normalizeBuilding(res) : normalizeBuilding({ id: body.id ?? id, ...body });
  } catch (e) {
    // Fallback: return merged local object
    return normalizeBuilding({ id: body.id ?? id, ...body });
  }
}

export async function deleteBuilding(id) {
  return api.delete(`/building/${id}`);
}

export async function deleteBuildingsBulk(ids = []) {
  await Promise.all(ids.map((i) => deleteBuilding(i)));
}
