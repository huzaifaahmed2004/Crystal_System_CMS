import api from './api';

export const normalizeFloor = (dto) => ({
  // Support multiple API shapes: snake_case, camelCase, legacy
  floor_id: dto?.floor_id ?? dto?.id,
  floor_code: dto?.floor_code ?? dto?.floorCode ?? dto?.code ?? '',
  name: dto?.name ?? '',
  building_id: dto?.building_id ?? dto?.buildingId ?? null,
  rows: dto?.rows ?? 0,
  columns: dto?.columns ?? 0,
  created_at: dto?.created_at ?? dto?.createdAt ?? null,
  updated_at: dto?.updated_at ?? dto?.updatedAt ?? null,
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

// Fetch floor with building and rooms (with tables)
export async function getFloorWithRelations(id) {
  try {
    const res = await api.get(`/floor/${id}/with-relations`);
    return normalizeFloorWithRelations(res || null);
  } catch (e) {
    return null;
  }
}

// Normalize floor with relations
function normalizeFloorWithRelations(dto) {
  if (!dto || typeof dto !== 'object') return dto;
  const base = normalizeFloor(dto);
  // Prefer 'rooms'; map from 'room' if present
  const rawRooms = Array.isArray(dto.rooms) ? dto.rooms : (Array.isArray(dto.room) ? dto.room : []);
  const rooms = rawRooms.map((r) => {
    const rawTables = Array.isArray(r?.tables) ? r.tables : (Array.isArray(r?.table) ? r.table : []);
    const tables = rawTables.map((t) => ({
      table_id: t?.table_id ?? t?.id,
      table_code: t?.table_code ?? t?.tableCode ?? t?.code,
      name: t?.name ?? '',
      room_id: t?.room_id ?? t?.roomId ?? (r?.room_id ?? r?.id),
      capacity: Number(t?.capacity) || 0,
      orientation: t?.orientation ?? '',
      // map table_job -> tableJobs [{ job_id, job }]
      tableJobs: (Array.isArray(t?.tableJobs) ? t.tableJobs : (Array.isArray(t?.table_job) ? t.table_job : []))
        .map((tj) => ({
          job_id: tj?.job_id ?? tj?.job?.job_id ?? null,
          job: tj?.job ?? null,
          assigned_at: tj?.assigned_at ?? null,
        })),
    }));
    return {
      room_id: r?.room_id ?? r?.id,
      room_code: r?.room_code ?? r?.roomCode ?? r?.code,
      name: r?.name ?? '',
      floor_id: r?.floor_id ?? r?.floorId ?? base.floor_id ?? null,
      cellType: r?.cellType ?? r?.cell_type ?? '',
      row: r?.row ?? r?.cell_row ?? null,
      column: r?.column ?? r?.cell_column ?? null,
      tables,
    };
  });
  return { ...base, building: dto.building ?? null, rooms };
}

export async function createFloor(payload) {
  const body = {
    building_id: Number(payload.building_id),
    // API expects camelCase floorCode per latest requirement
    floorCode: payload.floorCode !== undefined
      ? String(payload.floorCode).trim()
      : (payload.floor_code !== undefined ? String(payload.floor_code).trim() : undefined),
    name: payload.name !== undefined ? String(payload.name).trim() : undefined,
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
  if (payload.floorCode !== undefined) body.floorCode = String(payload.floorCode).trim();
  else if (payload.floor_code !== undefined) body.floorCode = String(payload.floor_code).trim();
  if (payload.name !== undefined) body.name = String(payload.name).trim();
  if (payload.building_id !== undefined) body.building_id = Number(payload.building_id);
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
