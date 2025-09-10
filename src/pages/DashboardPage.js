import React, { useEffect, useState } from 'react';
import { getCompaniesWithRelations } from '../services/companyService';
import { getProcessesWithRelations } from '../services/processService';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ companies: 0, processes: 0, tasks: 0, jobs: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [companies, processes] = await Promise.all([
          getCompaniesWithRelations(),
          getProcessesWithRelations()
        ]);

        if (!mounted) return;

        const companiesCount = Array.isArray(companies) ? companies.length : 0;
        const processesList = Array.isArray(processes) ? processes : [];
        let tasksCount = 0;
        const jobIds = new Set();
        processesList.forEach(p => {
          if (Array.isArray(p?.process_tasks)) {
            tasksCount += p.process_tasks.length;
            p.process_tasks.forEach(pt => {
              const jobs = pt?.task?.jobTasks || [];
              jobs.forEach(jt => { if (jt?.job?.job_id) jobIds.add(jt.job.job_id); });
            });
          }
        });

        setStats({ companies: companiesCount, processes: processesList.length, tasks: tasksCount, jobs: jobIds.size });
      } catch (e) {
        if (mounted) setError('Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="dashboard-content-area">
      <div className="dashboard-header-section">
        <h2 className="dashboard-title">Dashboard Overview</h2>
        <p className="dashboard-subtitle">Quick overview of key CMS metrics</p>
      </div>

      {/* System Stats Widgets (real data) */}
      {loading && (
        <div style={{ padding: '0.75rem', color: '#64748b' }}>Loading dashboard…</div>
      )}
      {error && (
        <div style={{ padding: '0.75rem', color: '#b91c1c' }}>{error}</div>
      )}
      {!loading && !error && (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M22 19.07l-7.07-7.07a6 6 0 11-2.83-2.83L19.07 16.24 22 19.07zM7 13a4 4 0 100-8 4 4 0 000 8z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.companies}</h3>
            <p className="stat-label">Companies</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16v4H4V7zm0 6h10v4H4v-4z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.processes}</h3>
            <p className="stat-label">Processes</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4l-2-2-8 8-3-3-2 2 5 5zM2 20h20v2H2v-2z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.tasks}</h3>
            <p className="stat-label">Tasks</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19.14 12.94a7.992 7.992 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.963 7.963 0 00-1.62-.94l-.36-2.54A.5.5 0 0013.9 0h-3.8a.5.5 0 00-.5.42l-.36 2.54c-.57.22-1.11.51-1.62.94l-2.39-.96a.5.5 0 00-.6.22L1.71 6.04a.5.5 0 00.12.64l2.03 1.58c-.05.62-.05 1.25 0 1.88L1.83 11.7a.5.5 0 00-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.43 1.05.77 1.62.99l.36 2.54c.04.24.25.42.5.42h3.8c.25 0 .46-.18.5-.42l.36-2.54c.57-.22 1.11-.55 1.62-.99l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.jobs}</h3>
            <p className="stat-label">Jobs</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default DashboardPage;
