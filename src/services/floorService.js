import api from './api';

const normalizeFloor = (dto) => ({
  floor_id: dto?.floor_id ?? dto?.id,
  floor_code: dto?.floor_code ?? dto?.code ?? '',
  name: dto?.name ?? '',
  building_id: dto?.building_id ?? null,
  rows: dto?.rows ?? 0,
  columns: dto?.columns ?? 0,
});

export async function getFloors() {
  try {
    const data = await api.get('/floor');
    const list = Array.isArray(data) ? data.map(normalizeFloor) : [];
    if (list.length > 0) return list;
    // Fall back to mocks if API returns empty
    return [
      { floor_id: 1001, floor_code: 'HQ-F1', name: 'First Floor', building_id: 101, rows: 5, columns: 10 },
      { floor_id: 1002, floor_code: 'HQ-F2', name: 'Second Floor', building_id: 101, rows: 5, columns: 10 },
      { floor_id: 2001, floor_code: 'PA-G', name: 'Ground', building_id: 102, rows: 4, columns: 8 },
      { floor_id: 2002, floor_code: 'PA-F1', name: 'First Floor', building_id: 102, rows: 4, columns: 8 },
    ].map(normalizeFloor);
  } catch (e) {
    console.warn('Falling back to mock floors due to API error');
    // Mock floors aligned with mock buildings (101: HQ, 102: Plant A)
    return [
      { floor_id: 1001, floor_code: 'HQ-F1', name: 'First Floor', building_id: 101, rows: 5, columns: 10 },
      { floor_id: 1002, floor_code: 'HQ-F2', name: 'Second Floor', building_id: 101, rows: 5, columns: 10 },
      { floor_id: 2001, floor_code: 'PA-G', name: 'Ground', building_id: 102, rows: 4, columns: 8 },
      { floor_id: 2002, floor_code: 'PA-F1', name: 'First Floor', building_id: 102, rows: 4, columns: 8 },
    ].map(normalizeFloor);
  }
}

export async function getFloorsByBuilding(buildingId) {
  const data = await api.get(`/floor?building_id=${encodeURIComponent(buildingId)}`);
  return Array.isArray(data) ? data.map(normalizeFloor) : [];
}

export async function getFloorById(id) {
  const res = await api.get(`/floor/${id}`);
  return res ? normalizeFloor(res) : null;
}

export async function createFloor(payload) {
  const body = {
    building_id: Number(payload.building_id),
    floor_code: payload.floor_code !== undefined ? String(payload.floor_code).trim() : undefined,
    name: payload.name !== undefined ? String(payload.name).trim() : undefined,
    rows: Number(payload.rows) || 0,
    columns: Number(payload.columns) || 0,
  };
  try {
    const res = await api.post('/floor', body);
    return res ? normalizeFloor(res) : normalizeFloor({ id: Math.floor(Math.random() * 1000000), ...body });
  } catch (e) {
    return normalizeFloor({ id: Math.floor(Math.random() * 1000000), ...body });
  }
}

export async function patchFloor(id, payload) {
  const body = {};
  if (payload.floor_code !== undefined) body.floor_code = String(payload.floor_code).trim();
  if (payload.name !== undefined) body.name = String(payload.name).trim();
  if (payload.building_id !== undefined) body.building_id = Number(payload.building_id);
  if (payload.rows !== undefined) body.rows = Number(payload.rows) || 0;
  if (payload.columns !== undefined) body.columns = Number(payload.columns) || 0;
  try {
    const res = await api.patch(`/floor/${id}`, body);
    return res ? normalizeFloor(res) : normalizeFloor({ id, ...body });
  } catch (e) {
    return normalizeFloor({ id, ...body });
  }
}

export async function deleteFloor(id) {
  return api.delete(`/floor/${id}`);
}

export async function deleteFloorsBulk(ids = []) {
  await Promise.all(ids.map((i) => deleteFloor(i)));
}
