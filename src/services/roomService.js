import api from './api';

// Normalizer
const normalizeRoom = (dto) => ({
  room_id: dto?.room_id ?? dto?.id,
  room_code: dto?.room_code ?? dto?.code ?? '',
  name: dto?.name ?? '',
  floor_id: dto?.floor_id ?? null,
  floor_name: dto?.floor_name ?? dto?.floor ?? '',
});

const MOCK_ROOMS = [
  { room_id: 501, room_code: 'HQ-F1-R1', name: 'Room A', floor_id: 1001, floor_name: 'HQ-F1' },
  { room_id: 502, room_code: 'HQ-F1-R2', name: 'Room B', floor_id: 1001, floor_name: 'HQ-F1' },
  { room_id: 601, room_code: 'PA-G-R1', name: 'Plant Ops', floor_id: 2001, floor_name: 'PA-G' },
];

export async function getRooms() {
  try {
    const data = await api.get('/rooms');
    const arr = Array.isArray(data) ? data.map(normalizeRoom) : [];
    if (!arr.length) return MOCK_ROOMS.map(normalizeRoom);
    return arr;
  } catch (_) {
    return MOCK_ROOMS.map(normalizeRoom);
  }
}

export async function patchRoom(room_id, payload) {
  const body = {
    room_code: payload?.room_code ?? '',
    name: payload?.name ?? '',
  };
  try {
    const data = await api.patch(`/rooms/${room_id}`, body);
    return normalizeRoom(data ?? { ...body, id: room_id });
  } catch (e) {
    // optimistic fallback
    return normalizeRoom({ ...body, id: room_id });
  }
}

export { normalizeRoom };
