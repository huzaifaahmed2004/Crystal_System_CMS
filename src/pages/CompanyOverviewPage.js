import React, { useEffect, useMemo, useState } from 'react';
import { getCompaniesWithRelations } from '../services/companyService';
import { getProcessesWithRelations } from '../services/processService';

const metricPill = (label, value, colorBg, colorText) => (
  <div style={{ background: colorBg, color: colorText, padding: '0.45rem 0.7rem', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
    {label}: {value}
  </div>
);

const CompanyOverviewPage = () => {
  const [companies, setCompanies] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [companiesData, processesData] = await Promise.all([
          getCompaniesWithRelations(),
          getProcessesWithRelations(),
        ]);
        if (mounted) {
          setCompanies(companiesData);
          setProcesses(processesData);
        }
      } catch (e) {
        if (mounted) setError('Failed to load overview');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => {
    const acc = { companies: 0, people: 0, buildings: 0, floors: 0, rooms: 0, processes: 0, tasks: 0, jobs: 0 };
    for (const c of companies) {
      acc.companies += 1;
      const buildings = Array.isArray(c?.buildings) ? c.buildings : [];
      const people = Array.isArray(c?.people) ? c.people.length : 0;
      let floors = 0;
      let rooms = 0;
      buildings.forEach((b) => {
        if (Array.isArray(b?.floors)) {
          floors += b.floors.length;
          b.floors.forEach((f) => {
            if (Array.isArray(f?.rooms)) rooms += f.rooms.length;
          });
        } else if (b && b.floor_id && !b.floors) {
          // Defensive: handle accidental floor objects inside buildings array
          floors += 1;
          if (Array.isArray(b?.rooms)) rooms += b.rooms.length;
        }
      });
      // Processes/tasks/jobs from /process/with-relations for this company
      const companyId = c.company_id || c.id;
      const procs = Array.isArray(processes) ? processes.filter(p => (p.company_id || p.company?.company_id) === companyId) : [];
      let taskCount = 0;
      const jobIds = new Set();
      procs.forEach(p => {
        if (Array.isArray(p?.process_tasks)) {
          taskCount += p.process_tasks.length;
          p.process_tasks.forEach(pt => {
            const jobs = pt?.task?.jobTasks || [];
            jobs.forEach(jt => { if (jt?.job?.job_id) jobIds.add(jt.job.job_id); });
          });
        }
      });
      acc.people += people;
      acc.buildings += buildings.length;
      acc.floors += floors;
      acc.rooms += rooms;
      acc.processes += procs.length;
      acc.tasks += taskCount;
      acc.jobs += jobIds.size;
    }
    return acc;
  }, [companies, processes]);

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
              {metricPill('People', totals.people, '#e0f2fe', '#075985')}
              {metricPill('Buildings', totals.buildings, '#eff6ff', '#1e40af')}
              {metricPill('Floors', totals.floors, '#ecfeff', '#155e75')}
              {metricPill('Rooms', totals.rooms, '#fefce8', '#92400e')}
              {metricPill('Processes', totals.processes, '#fee2e2', '#991b1b')}
              {metricPill('Tasks', totals.tasks, '#f0fdf4', '#166534')}
              {metricPill('Jobs', totals.jobs, '#e0e7ff', '#3730a3')}
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: 'white', padding: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Companies</h2>
              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {companies.slice(0, 6).map((c) => {
                  const buildings = Array.isArray(c?.buildings) ? c.buildings : [];
                  const people = Array.isArray(c?.people) ? c.people.length : 0;
                  let floors = 0;
                  let rooms = 0;
                  buildings.forEach((b) => {
                    if (Array.isArray(b?.floors)) {
                      floors += b.floors.length;
                      b.floors.forEach((f) => {
                        if (Array.isArray(f?.rooms)) rooms += f.rooms.length;
                      });
                    } else if (b && b.floor_id && !b.floors) {
                      floors += 1;
                      if (Array.isArray(b?.rooms)) rooms += b.rooms.length;
                    }
                  });
                  const companyId = c.company_id || c.id;
                  const procs = Array.isArray(processes) ? processes.filter(p => (p.company_id || p.company?.company_id) === companyId) : [];
                  let taskCount = 0;
                  const jobIds = new Set();
                  procs.forEach(p => {
                    if (Array.isArray(p?.process_tasks)) {
                      taskCount += p.process_tasks.length;
                      p.process_tasks.forEach(pt => {
                        const jobs = pt?.task?.jobTasks || [];
                        jobs.forEach(jt => { if (jt?.job?.job_id) jobIds.add(jt.job.job_id); });
                      });
                    }
                  });
                  return (
                  <div key={c.company_id || c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{c.name}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {metricPill('Pe', people, '#e0f2fe', '#075985')}
                      {metricPill('B', buildings.length, '#eff6ff', '#1e40af')}
                      {metricPill('F', floors, '#ecfeff', '#155e75')}
                      {metricPill('R', rooms, '#fefce8', '#92400e')}
                      {metricPill('Pr', procs.length, '#fee2e2', '#991b1b')}
                      {metricPill('T', taskCount, '#f0fdf4', '#166534')}
                      {metricPill('J', jobIds.size, '#e0e7ff', '#3730a3')}
                    </div>
                  </div>
                );})}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyOverviewPage;
