import api from './api';
import { getFloors } from './floorService';

// Normalizer supports multiple API shapes (snake_case and camelCase)
const normalizeRoom = (dto) => ({
  room_id: dto?.room_id ?? dto?.id,
  room_code: dto?.room_code ?? dto?.roomCode ?? dto?.code ?? '',
  name: dto?.name ?? '',
  floor_id: dto?.floor_id ?? dto?.floorId ?? null,
  floor_name: dto?.floor_name ?? dto?.floor ?? dto?.floorName ?? '',
  row: dto?.row ?? dto?.cell_row ?? null,
  column: dto?.column ?? dto?.cell_column ?? null,
  cellType: dto?.cellType ?? dto?.cell_type ?? '',
  created_at: dto?.created_at ?? dto?.createdAt ?? null,
  updated_at: dto?.updated_at ?? dto?.updatedAt ?? null,
});

const MOCK_ROOMS = [
  { room_id: 501, room_code: 'HQ-F1-R1', name: 'Room A', floor_id: 1001, floor_name: 'HQ-F1' },
  { room_id: 502, room_code: 'HQ-F1-R2', name: 'Room B', floor_id: 1001, floor_name: 'HQ-F1' },
  { room_id: 601, room_code: 'PA-G-R1', name: 'Plant Ops', floor_id: 2001, floor_name: 'PA-G' },
];

export async function getRooms() {
  try {
    const data = await api.get('/room'); // backend uses singular resource naming like /floor, /company
    let arr = Array.isArray(data) ? data.map(normalizeRoom) : [];
    // Enrich floor_name if backend doesn't provide it
    const needFloorName = arr.some((r) => !r.floor_name && r.floor_id);
    if (needFloorName) {
      try {
        const floors = await getFloors();
        const fMap = new Map((floors || []).map((f) => [Number(f.floor_id), f]));
        arr = arr.map((r) => ({ ...r, floor_name: r.floor_name || fMap.get(Number(r.floor_id))?.name || '' }));
      } catch (_) {}
    }
    return arr;
  } catch (_) {
    return MOCK_ROOMS.map(normalizeRoom);
  }
}

export async function patchRoom(room_id, payload) {
  const roomCode = (payload?.roomCode ?? payload?.room_code ?? '').toString().trim();
  const name = (payload?.name ?? '').toString().trim();
  const body = { roomCode, name };
  try {
    const data = await api.patch(`/room/${room_id}`, body);
    return normalizeRoom(data ?? { ...body, id: room_id });
  } catch (e) {
    // optimistic fallback
    return normalizeRoom({ ...body, id: room_id });
  }
}

export { normalizeRoom };
