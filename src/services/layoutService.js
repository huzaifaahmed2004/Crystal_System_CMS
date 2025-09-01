import api from './api';

// Layout-related API helpers with graceful mock fallbacks

export async function getCompaniesLite() {
  try {
    const data = await api.get('/company');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    // Return empty to avoid dummy data in dropdowns
    return [];
  }
}

export async function getBuildingByCompany(companyId) {
  try {
    const buildings = await api.get(`/companies/${companyId}/buildings`);
    return Array.isArray(buildings) && buildings.length ? buildings[0] : null; // one building per company
  } catch (e) {
    // mock single building
    return { building_id: Number(companyId) * 100 + 1, name: `Building for ${companyId}` };
  }
}

export async function getFloors(buildingId) {
  try {
    const floors = await api.get(`/buildings/${buildingId}/floors`);
    return Array.isArray(floors) ? floors : [];
  } catch (e) {
    // mock 3 floors with different grids
    return [
      { floor_id: buildingId * 10 + 1, name: 'Floor 1', rows: 2, columns: 4 },
      { floor_id: buildingId * 10 + 2, name: 'Floor 2', rows: 3, columns: 3 },
      { floor_id: buildingId * 10 + 3, name: 'Floor 3', rows: 2, columns: 2 },
    ];
  }
}

export async function getRooms(floorId) {
  try {
    const rooms = await api.get(`/floors/${floorId}/rooms`);
    return Array.isArray(rooms) ? rooms : [];
  } catch (e) {
    // Fixed grid constraint: 2 rows x 5 columns, with the last column reserved.
    // We only return usable rooms (columns 1..4) so UI can render column 5 as reserved.
    const rows = 2, cols = 4; // usable columns only
    const rooms = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        rooms.push({ room_id: floorId * 100 + r * 10 + c, name: `R${r}-${c}`, cell_row: r, cell_column: c });
      }
    }
    return rooms;
  }
}

export async function getTableTypes() {
  try {
    const types = await api.get('/table-types');
    return Array.isArray(types) ? types : [];
  } catch (e) {
    // mock palette of items
    return [
      { id: 'desk', name: 'Desk' },
      { id: 'double-desk', name: 'Double Desk' },
      { id: 'workbench', name: 'Workbench' },
      { id: 'meeting', name: 'Meeting Table' },
      { id: 'sofa', name: 'Sofa' },
      { id: 'storage', name: 'Storage' },
    ];
  }
}

export async function saveFloorLayout(floorId, assignments) {
  // assignments: [{ room_id, table_type_id }]
  try {
    const res = await api.post(`/floors/${floorId}/layout`, { assignments });
    return res;
  } catch (e) {
    console.warn('Mock save layout success');
    return { ok: true };
  }
}
