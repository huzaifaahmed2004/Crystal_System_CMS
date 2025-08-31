import api from './api';

// Create a table in a room
// body: { tableCode, name, room_id, capacity, orientation }
export async function createTable(body) {
  const payload = {
    tableCode: String(body.tableCode || '').trim(),
    name: String(body.name || '').trim(),
    room_id: Number(body.room_id),
    capacity: Number(body.capacity) || 0,
    orientation: String(body.orientation || '').toUpperCase(),
  };
  const res = await api.post('/table', payload);
  return res || { id: Math.floor(Math.random() * 1000000), ...payload };
}

// Delete a table by id
export async function deleteTable(tableId) {
  return api.delete(`/table/${tableId}`);
}
