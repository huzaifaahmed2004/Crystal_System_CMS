import React, { useMemo } from 'react';

const OrganizationManagementPage = () => {
  const orgs = useMemo(
    () => [
      {
        id: 'org-1',
        name: 'Acme Holdings',
        code: 'ACM',
        departments: 8,
        jobs: 42,
        functions: 17,
        processes: 29,
        owner: 'Operations',
        description: 'Parent company overseeing manufacturing and logistics.'
      },
      {
        id: 'org-2',
        name: 'Acme Manufacturing',
        code: 'ACM-MFG',
        departments: 5,
        jobs: 21,
        functions: 9,
        processes: 14,
        owner: 'Production',
        description: 'Manufacturing division managing plant operations.'
      },
      {
        id: 'org-3',
        name: 'Acme Logistics',
        code: 'ACM-LOG',
        departments: 4,
        jobs: 18,
        functions: 7,
        processes: 11,
        owner: 'Supply Chain',
        description: 'Logistics and distribution across regions.'
      }
    ],
    []
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Organization Management</h1>
        <p className="page-subtitle">Manage organizations, their departments, functions, jobs, and processes. (Dummy data)</p>
      </div>

      <div className="page-content">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search organizations"
              aria-label="Search organizations"
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
          <select aria-label="Filter by owner" style={{ padding: '0.6rem 0.9rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <option>All Owners</option>
            <option>Operations</option>
            <option>Production</option>
            <option>Supply Chain</option>
          </select>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {orgs.map((o) => (
            <div key={o.id} style={{
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
                    <div style={{ fontSize: 12, color: '#64748b' }}>{o.code} · Owner: {o.owner}</div>
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

              <p style={{ color: '#374151', fontSize: 14, margin: '0 0 0.75rem 0' }}>{o.description}</p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ background: '#eff6ff', color: '#1e40af', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Departments: {o.departments}</div>
                <div style={{ background: '#ecfeff', color: '#155e75', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Jobs: {o.jobs}</div>
                <div style={{ background: '#f0fdf4', color: '#166534', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Functions: {o.functions}</div>
                <div style={{ background: '#fef3c7', color: '#92400e', padding: '0.35rem 0.6rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Processes: {o.processes}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrganizationManagementPage;
