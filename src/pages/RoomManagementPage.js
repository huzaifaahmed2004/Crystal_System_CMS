import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { getRooms, patchRoom } from '../services/roomService';

const RoomManagementPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ room_code: '', name: '' });

  // Date/time helpers (same pattern used in CompanyManagementPage)
  const splitDateTime = (iso) => {
    if (!iso) return { date: '—', time: '' };
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: '—', time: '' };
    }
  };

  const renderDateTime = (iso) => {
    const { date, time } = splitDateTime(iso);
    return (
      <div className="dt-wrap">
        <div>{date}</div>
        <div className="subtext">{time}</div>
      </div>
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const rs = await getRooms();
        setRooms(rs || []);
      } catch (e) {
        setError(e?.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = Array.isArray(rooms) ? rooms : [];
    if (!q) return arr;
    return arr.filter(r =>
      String(r.room_code || '').toLowerCase().includes(q) ||
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.floor_name || '').toLowerCase().includes(q)
    );
  }, [rooms, search]);

  const startEdit = (r) => {
    setEditingId(r.room_id);
    setEditForm({ room_code: r.room_code || '', name: r.name || '' });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({ room_code: '', name: '' }); };
  const saveEdit = async () => {
    if (!editingId) return;
    const payload = { room_code: (editForm.room_code || '').trim(), name: (editForm.name || '').trim() };
    if (!payload.room_code || !payload.name) return;
    try {
      const updated = await patchRoom(editingId, payload);
      setRooms(prev => prev.map(r => {
        if (r.room_id !== editingId) return r;
        return {
          ...r,
          ...updated,
          // Preserve floor info if backend/normalizer did not include it
          floor_id: updated.floor_id ?? r.floor_id,
          floor_name: updated.floor_name || r.floor_name,
        };
      }));
      cancelEdit();
    } catch {
      // optimistic fallback
      setRooms(prev => prev.map(r => r.room_id === editingId ? { ...r, ...payload, floor_id: r.floor_id, floor_name: r.floor_name } : r));
      cancelEdit();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Rooms</h2>
            <p className="page-subtitle">View and edit room code and name. No create or delete.</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                placeholder="Search by code, name, or floor"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') {/* no-op: client filter */} }}
              />
              <button className="secondary-btn sm" onClick={() => setSearch('')}>Clear</button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading rooms...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr 160px' }}>
              <div className="cell">Room Code</div>
              <div className="cell">Room Name</div>
              <div className="cell">Floor</div>
              <div className="cell">Created at</div>
              <div className="cell">Updated at</div>
              <div className="cell actions" style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {(filtered || []).length === 0 ? (
              <div className="no-results">No rooms found</div>
            ) : (
              filtered.map((r) => (
                <div key={r.room_id} className="roles-table-row" style={{ gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr 160px' }}>
                  <div className="cell">
                    {editingId === r.room_id ? (
                      <input value={editForm.room_code} onChange={(e) => setEditForm(s => ({ ...s, room_code: e.target.value }))} />
                    ) : (
                      r.room_code || '-'
                    )}
                  </div>
                  <div className="cell">
                    {editingId === r.room_id ? (
                      <input value={editForm.name} onChange={(e) => setEditForm(s => ({ ...s, name: e.target.value }))} />
                    ) : (
                      r.name || '-'
                    )}
                  </div>
                  <div className="cell">{r.floor_name || '-'}</div>
                  <div className="cell">{renderDateTime(r.created_at)}</div>
                  <div className="cell">{renderDateTime(r.updated_at)}</div>
                  <div className="cell actions" style={{ textAlign: 'right' }}>
                    {editingId === r.room_id ? (
                      <>
                        <button className="primary-btn sm" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                        <button className="secondary-btn sm" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <button className="secondary-btn sm" onClick={() => startEdit(r)}>Edit</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
;

export default RoomManagementPage;
