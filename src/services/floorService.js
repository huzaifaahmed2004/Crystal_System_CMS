import api from './api';

const normalizeFloor = (dto) => ({
  floor_id: dto?.floor_id ?? dto?.id,
  building_id: dto?.building_id ?? null,
  floor_no: dto?.floor_no ?? null,
  rows: dto?.rows ?? 0,
  columns: dto?.columns ?? 0,
});

export async function getFloors() {
  const data = await api.get('/floor');
  return Array.isArray(data) ? data.map(normalizeFloor) : [];
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
    floor_no: Number(payload.floor_no),
    rows: Number(payload.rows) || 0,
    columns: Number(payload.columns) || 0,
  };
  const res = await api.post('/floor', body);
  return res ? normalizeFloor(res) : normalizeFloor({ id: body.floor_id, ...body });
}

export async function patchFloor(id, payload) {
  const body = {};
  if (payload.floor_no !== undefined) body.floor_no = Number(payload.floor_no);
  if (payload.rows !== undefined) body.rows = Number(payload.rows) || 0;
  if (payload.columns !== undefined) body.columns = Number(payload.columns) || 0;
  const res = await api.patch(`/floor/${id}`, body);
  return res ? normalizeFloor(res) : normalizeFloor({ id, ...body });
}

export async function deleteFloor(id) {
  return api.delete(`/floor/${id}`);
}

export async function deleteFloorsBulk(ids = []) {
  await Promise.all(ids.map((i) => deleteFloor(i)));
}
