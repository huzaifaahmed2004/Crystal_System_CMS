import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import '../styles/job-detail.css';
import { useAppContext } from '../context/AppContext';
import { getTaskWithRelations } from '../services/taskService';
import { getCompaniesLite } from '../services/layoutService';
import RichTextEditor from '../components/ui/RichTextEditor';
import SideTabs from '../components/layout/SideTabs';
import SkillTable from '../components/ui/SkillTable';
import { LEVELS } from '../components/ui/levels';

const TaskDetailPage = () => {
  const { setActiveSection, setJobId } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companiesMap, setCompaniesMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Load companies map for resolving company names in jobs table
        try {
          const cs = await getCompaniesLite();
          const map = {};
          (Array.isArray(cs) ? cs : []).forEach(c => { map[String(c.company_id || c.id)] = c.name; });
          setCompaniesMap(map);
        } catch {}
        let id = null;
        try {
          const stored = localStorage.getItem('activeTaskId');
          if (stored) id = stored;
        } catch {}
        const res = id ? await getTaskWithRelations(id) : null;
        setData(res);
      } catch (e) {
        setError(e?.message || 'Failed to load task');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goBack = () => {
    try { localStorage.removeItem('activeTaskId'); } catch {}
    setActiveSection('task-management');
  };

  const companyName = useMemo(() => data?.company?.name || '-', [data]);

  const processesList = useMemo(() => {
    // Normalize possible backend shapes to an array of { process_name, process_code, name, ... }
    if (!data) return [];
    // 1) Preferred: data.process (object or array)
    if (data.process) {
      const p = data.process;
      return Array.isArray(p) ? p : [p];
    }
    // 2) Alternative: data.processes (array)
    if (Array.isArray(data.processes)) {
      return data.processes;
    }
    // 3) Linking arrays: data.process_tasks or data.process_task with nested .process
    const links = Array.isArray(data.process_tasks)
      ? data.process_tasks
      : (Array.isArray(data.process_task) ? data.process_task : []);
    if (links.length > 0) {
      return links
        .map((pt) => pt?.process || null)
        .filter(Boolean);
    }
    // Fallback: no associated process info
    return [];
  }, [data]);

  const jobRows = useMemo(() => {
    const arr = Array.isArray(data?.jobTasks) ? data.jobTasks : [];
    return arr.map(jt => jt.job).filter(Boolean);
  }, [data]);

  const defaultTab = React.useMemo(() => {
    try { return localStorage.getItem('taskDetailsActiveTab') || 'basic'; } catch { return 'basic'; }
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Task Details</h2>
            <p className="page-subtitle">Read-only view of a task and its relations</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={goBack}>← Back</button>
            <button
              className="primary-btn"
              onClick={() => { try { localStorage.setItem('activeTaskId', String(data?.task_id)); } catch {}; setActiveSection('task-edit'); }}
              disabled={!data?.task_id}
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : !data ? (
          <div className="no-results">Task not found</div>
        ) : (
          <SideTabs
            defaultActiveId={defaultTab}
            tabs={[
              {
                id: 'basic',
                label: 'Basic Details',
                content: (
                  <div className="role-card">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Task Name</label>
                        <input value={data.task_name || ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Task Code</label>
                        <input value={data.task_code || ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Capacity (minutes)</label>
                        <input value={data.task_capacity_minutes != null ? String(data.task_capacity_minutes) : ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Company</label>
                        <input value={companyName} disabled />
                      </div>
                      <div className="form-group full">
                        <label>Associated Processes</label>
                        <div className="chip-list">
                          {processesList.length === 0 ? (
                            <span className="muted">None</span>
                          ) : (
                            processesList.map((p, idx) => {
                              const label = (p?.process_name || p?.name || `Process ${idx + 1}`);
                              const code = (p?.process_code || p?.code);
                              return (
                                <span key={idx} className="chip">
                                  {label}{code ? ` [${code}]` : ''}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                id: 'description',
                label: 'Description',
                content: (
                  <div className="role-card">
                    <RichTextEditor label="Task Description" value={data.task_overview || ''} readOnly height={280} />
                  </div>
                )
              },
              {
                id: 'jobs',
                label: 'Jobs',
                content: (
                  <div className="role-card">
                    <div className="section-title" style={{ marginBottom: 12, fontWeight: 600 }}>Associated Jobs</div>
                    <div className="roles-table">
                      <div className="roles-table-header" style={{ gridTemplateColumns: '1.8fr 1.2fr 1.2fr 140px' }}>
                        <div className="cell">Job Name</div>
                        <div className="cell">Job Code</div>
                        <div className="cell">Company</div>
                        <div className="cell actions" style={{ textAlign: 'right' }}>Actions</div>
                      </div>
                      {jobRows.length === 0 ? (
                        <div className="no-results">No jobs associated</div>
                      ) : jobRows.map(j => (
                        <div key={j.job_id} className="roles-table-row" style={{ gridTemplateColumns: '1.8fr 1.2fr 1.2fr 140px' }}>
                          <div className="cell">{j.name || '-'}</div>
                          <div className="cell">{j.jobCode || j.job_code || '-'}</div>
                          <div className="cell">{companiesMap[String(j.company_id)] || j.company?.name || '-'}</div>
                          <div className="cell actions" style={{ textAlign: 'right' }}>
                            <button
                              className="secondary-btn sm"
                              onClick={() => { try { localStorage.setItem('activeJobId', String(j.job_id)); localStorage.setItem('jobReturnTo', 'task-detail'); localStorage.setItem('taskDetailsActiveTab', 'jobs'); } catch {}; try { setJobId(String(j.job_id)); } catch {}; setActiveSection('job-detail'); }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              },
              {
                id: 'skills',
                label: 'Skills',
                content: (
                  <div className="role-card">
                    <div className="section-title" style={{ marginBottom: 12, fontWeight: 600 }}>Req Skills</div>
                    <SkillTable
                      mode="view"
                      skills={(Array.isArray(data.taskSkills) ? data.taskSkills : []).map(ts => ({
                        name: ts?.skill?.name || ts?.skill_name || '-',
                        skillDescription: ts?.skill?.description || '',
                        level: ts?.level?.level_name || '',
                      }))}
                      levels={LEVELS}
                    />
                  </div>
                )
              }
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default TaskDetailPage;
