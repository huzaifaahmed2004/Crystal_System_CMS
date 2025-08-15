import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getCompaniesWithStats } from '../services/organizationService';

const OrganizationManagementPage = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const { setActiveSection, setLayoutCompanyId } = useAppContext();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCompaniesWithStats();
        if (mounted) setOrgs(data);
      } catch (e) {
        if (mounted) setError('Failed to load organizations');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredOrgs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orgs;
    return orgs.filter(o => (o.name || '').toLowerCase().includes(term));
  }, [orgs, search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Organization Management</h1>
        <p className="page-subtitle">Manage companies and view their related structures and workloads.</p>
      </div>

      <div className="page-content">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search companies"
              aria-label="Search organizations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '0.6rem 2.5rem 0.6rem 0.9rem',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                outline: 'none',
                minWidth: 260
              }}
            />
            <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: 8, color: '#64748b' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 19.07l-7.07-7.07a6 6 0 11-2.83-2.83L19.07 16.24 22 19.07zM7 13a4 4 0 100-8 4 4 0 000 8z" fill="currentColor"/>
              </svg>
            </span>
          </div>
          {/* Future: owner/created_by filter can go here */}
          <button className="primary-btn" type="button" aria-label="Add organization" style={{
            padding: '0.6rem 1rem',
            borderRadius: 8,
            border: 'none',
            color: 'white',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            boxShadow: '0 6px 16px rgba(59,130,246,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer'
          }}>
            <span aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            New Organization
          </button>
        </div>

        {loading && (
          <div style={{ padding: '1rem', color: '#64748b' }}>Loading companies…</div>
        )}
        {error && (
          <div style={{ padding: '1rem', color: '#b91c1c' }}>{error}</div>
        )}

        {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filteredOrgs.length === 0 ? (
            <div style={{ color: '#64748b' }}>No companies found.</div>
          ) : (
          filteredOrgs.map((o) => (
            <div key={o.company_id || o.id} style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '1rem',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span aria-hidden="true" style={{ color: '#1e40af' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3 11h18v10H3V11zm2-6h14v4H5V5z" fill="currentColor"/>
                    </svg>
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{o.name}</div>
                    {o.code || o.owner ? (
                      <div style={{ fontSize: 12, color: '#64748b' }}>{o.code}{o.code && o.owner ? ' · ' : ''}{o.owner ? `Owner: ${o.owner}` : ''}</div>
                    ) : null}
                  </div>
                </div>
                <button type="button" aria-label={`Manage ${o.name}`} style={{
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: 8,
                  padding: '0.4rem 0.6rem',
                  cursor: 'pointer'
                }}>
                  <span aria-hidden="true" style={{ display: 'inline-flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M4 7h16v2H4zM4 11h16v2H4zM4 15h16v2H4z" fill="currentColor"/>
                    </svg>
                  </span>
                </button>
              </div>

              {o.description && (
                <p style={{ color: '#374151', fontSize: 14, margin: '0 0 0.75rem 0' }}>{o.description}</p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ background: '#eff6ff', color: '#1e40af', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Buildings: {o.stats?.buildings ?? 0}</div>
                <div style={{ background: '#ecfeff', color: '#155e75', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Floors: {o.stats?.floors ?? 0}</div>
                <div style={{ background: '#fefce8', color: '#92400e', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Rooms: {o.stats?.rooms ?? 0}</div>
                <div style={{ background: '#f0fdf4', color: '#166534', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Functions: {o.stats?.functions ?? 0}</div>
                <div style={{ background: '#e0f2fe', color: '#075985', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Jobs: {o.stats?.jobs ?? 0}</div>
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Processes: {o.stats?.processes ?? 0}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setLayoutCompanyId(o.company_id || o.id); setActiveSection('layout-management'); }}
                  className="primary-btn"
                  style={{
                    padding: '0.5rem 0.8rem',
                    borderRadius: 8,
                    border: 'none',
                    color: 'white',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    boxShadow: '0 6px 16px rgba(99,102,241,0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v2H4zM4 11h10v2H4zM4 15h12v2H4z" fill="currentColor"/></svg>
                  Manage Layout
                </button>
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

export default OrganizationManagementPage;
