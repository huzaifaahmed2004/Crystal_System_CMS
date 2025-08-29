import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { getBuildings, deleteBuilding, deleteBuildingsBulk } from '../services/buildingService';
import { useAppContext } from '../context/AppContext';

const BuildingManagementPage = () => {
  const { setActiveSection, setBuildingId, setBuildingFormMode } = useAppContext();

  const [buildings, setBuildings] = useState([]);
  const [allBuildings, setAllBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getBuildings();
        const list = Array.isArray(data) ? data : [];
        setAllBuildings(list);
        setBuildings(list);
      } catch (e) {
        setError(e?.message || 'Failed to load buildings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allSelected = useMemo(() => buildings.length > 0 && selectedIds.size === buildings.length, [buildings, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(buildings.map(b => b.building_id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const reloadAll = async () => {
    try {
      setLoading(true);
      const data = await getBuildings();
      const list = Array.isArray(data) ? data : [];
      setAllBuildings(list);
      setBuildings(list);
      setError(null);
    } catch (e) {
      setError('Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const term = String(searchId).trim().toLowerCase();
    if (!term) {
      await reloadAll();
      return;
    }
    setLoading(true);
    const filtered = allBuildings.filter((b) => String(b.building_code || '')
      .toLowerCase()
      .includes(term));
    setBuildings(filtered);
    setError(null);
    setLoading(false);
  };

  const clearSearch = async () => {
    setSearchId('');
    await reloadAll();
  };

  const goToDetail = (mode, id = null) => {
    setBuildingFormMode(mode);
    setBuildingId(id);
    setActiveSection('building-detail');
  };

  const goToEdit = (id) => {
    setBuildingId(id);
    setActiveSection('building-edit');
  };

  const removeSingle = async (id) => {
    // Requirement: delete should open new page, not inline
    goToDetail('delete', id);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const ok = window.confirm(`Delete ${ids.length} selected building(s)?`);
    if (!ok) return;
    try {
      await deleteBuildingsBulk(ids);
      setBuildings((prev) => prev.filter(b => !selectedIds.has(b.building_id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e?.message || 'Failed to delete selected buildings');
    }
  };

  const formatTs = (v) => {
    if (!v) return '-';
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return d.toLocaleString();
    } catch {
      return String(v);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Building Management</h2>
            <p className="page-subtitle">View, create, edit, and delete buildings</p>
          </div>
          <div className="roles-toolbar">
            <div className="roles-search">
              <input
                className="search-input"
                type="text"
                placeholder="Search by Building Code"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
              <button className="primary-btn sm" onClick={handleSearch} disabled={loading}>Search</button>
              <button className="secondary-btn sm" onClick={clearSearch} disabled={loading}>Clear</button>
            </div>
            <button className="primary-btn" onClick={() => goToDetail('create', null)}>+ Create Building</button>
            <button className="danger-btn" onClick={bulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading buildings...</div>
        ) : (
          <div className="roles-table">
            <div className="roles-table-header" style={{ gridTemplateColumns: '48px 1.5fr 1fr 1fr 1fr 140px 140px 220px' }}>
              <div className="cell checkbox">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </div>
              <div className="cell">Name</div>
              <div className="cell">Code</div>
              <div className="cell">Country</div>
              <div className="cell">City</div>
              <div className="cell">Updated At</div>
              <div className="cell">Created At</div>
              <div className="cell actions">Actions</div>
            </div>

            {buildings.length === 0 ? (
              <div className="no-results">No buildings found.</div>
            ) : (
              buildings.map((b) => (
                <div className={`roles-table-row ${selectedIds.has(b.building_id) ? 'selected' : ''}`} key={b.building_id} style={{ gridTemplateColumns: '48px 1.5fr 1fr 1fr 1fr 140px 140px 220px' }}>
                  <div className="cell checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(b.building_id)}
                      onChange={() => toggleSelect(b.building_id)}
                    />
                  </div>
                  <div className="cell">{b.name}</div>
                  <div className="cell">{b.building_code || '-'}</div>
                  <div className="cell">{b.country}</div>
                  <div className="cell">{b.city}</div>
                  <div className="cell">{formatTs(b.updated_at)}</div>
                  <div className="cell">{formatTs(b.created_at)}</div>
                  <div className="cell actions">
                    <button className="secondary-btn sm" onClick={() => goToDetail('view', b.building_id)}>View</button>
                    <button className="primary-btn sm" onClick={() => goToEdit(b.building_id)}>Edit</button>
                    <button className="danger-btn sm" onClick={() => removeSingle(b.building_id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingManagementPage;
