import React, { useEffect, useMemo, useState } from 'react';
import { getCompaniesWithStats } from '../services/companyService';

const metricPill = (label, value, colorBg, colorText) => (
  <div style={{ background: colorBg, color: colorText, padding: '0.45rem 0.7rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
    {label}: {value}
  </div>
);

const CompanyOverviewPage = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCompaniesWithStats();
        if (mounted) setCompanies(data);
      } catch (e) {
        if (mounted) setError('Failed to load overview');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => {
    const acc = { companies: 0, buildings: 0, floors: 0, rooms: 0, functions: 0, jobs: 0, processes: 0 };
    for (const c of companies) {
      acc.companies += 1;
      acc.buildings += c?.stats?.buildings ?? 0;
      acc.floors += c?.stats?.floors ?? 0;
      acc.rooms += c?.stats?.rooms ?? 0;
      acc.functions += c?.stats?.functions ?? 0;
      acc.jobs += c?.stats?.jobs ?? 0;
      acc.processes += c?.stats?.processes ?? 0;
    }
    return acc;
  }, [companies]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Company Overview</h1>
        <p className="page-subtitle">High-level view of companies and their structures.</p>
      </div>

      <div className="page-content">
        {loading && (
          <div style={{ padding: '1rem', color: '#64748b' }}>Loading overview…</div>
        )}
        {error && (
          <div style={{ padding: '1rem', color: '#b91c1c' }}>{error}</div>
        )}

        {!loading && !error && (
          <>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {metricPill('Companies', totals.companies, '#eef2ff', '#3730a3')}
              {metricPill('Buildings', totals.buildings, '#eff6ff', '#1e40af')}
              {metricPill('Floors', totals.floors, '#ecfeff', '#155e75')}
              {metricPill('Rooms', totals.rooms, '#fefce8', '#92400e')}
              {metricPill('Functions', totals.functions, '#f0fdf4', '#166534')}
              {metricPill('Jobs', totals.jobs, '#e0f2fe', '#075985')}
              {metricPill('Processes', totals.processes, '#fee2e2', '#991b1b')}
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: 'white', padding: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Companies</h2>
              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {companies.slice(0, 6).map((c) => (
                  <div key={c.company_id || c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{c.name}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {metricPill('B', c?.stats?.buildings ?? 0, '#eff6ff', '#1e40af')}
                      {metricPill('F', c?.stats?.floors ?? 0, '#ecfeff', '#155e75')}
                      {metricPill('R', c?.stats?.rooms ?? 0, '#fefce8', '#92400e')}
                      {metricPill('Fn', c?.stats?.functions ?? 0, '#f0fdf4', '#166534')}
                      {metricPill('J', c?.stats?.jobs ?? 0, '#e0f2fe', '#075985')}
                      {metricPill('P', c?.stats?.processes ?? 0, '#fee2e2', '#991b1b')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyOverviewPage;
