import React from 'react';
import '../styles/role-management.css';
import '../styles/job-detail.css';
import SideTabs from '../components/layout/SideTabs';
import { useAppContext } from '../context/AppContext';
import { getCompaniesLite } from '../services/layoutService';
import { getProcessWithRelations } from '../services/processService';
import RichTextEditor from '../components/ui/RichTextEditor';

const ProcessViewPage = () => {
  const { setActiveSection } = useAppContext();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [companiesMap, setCompaniesMap] = React.useState({});
  const [proc, setProc] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        let id = null;
        try { id = Number(localStorage.getItem('activeProcessId')); } catch {}
        if (!Number.isFinite(id) || id <= 0) id = 2; // fallback for demo
        const [companies, processData] = await Promise.all([
          getCompaniesLite().catch(() => []),
          getProcessWithRelations(id),
        ]);
        const cMap = {};
        (companies || []).forEach(c => { cMap[String(c.company_id || c.id)] = c.name; });
        setCompaniesMap(cMap);
        setProc(processData || null);
      } catch (e) {
        setError(e?.message || 'Failed to load process');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onBack = () => setActiveSection('process-management');

  const fmt = (v) => {
    try { const d = new Date(v); return isNaN(d.getTime()) ? '-' : d.toLocaleString(); } catch { return '-'; }
  };

  const workflowRows = React.useMemo(() => {
    const rows = Array.isArray(proc?.process_tasks) ? [...proc.process_tasks] : [];
    rows.sort((a,b) => (a?.order ?? 0) - (b?.order ?? 0));
    return rows.map(pt => {
      const t = pt.task || {};
      const jobs = Array.isArray(t.jobTasks) ? t.jobTasks.map(jt => jt?.job).filter(Boolean) : [];
      return { order: pt.order, task: t, jobs };
    });
  }, [proc]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">View Process</h2>
            <p className="page-subtitle">All fields are read-only</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : !proc ? (
          <div className="no-results">No process data</div>
        ) : (
          <SideTabs
            defaultActiveId="basic"
            tabs={[
              {
                id: 'basic',
                label: 'Basic Details',
                content: (
                  <div className="role-card">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Process Name</label>
                        <input value={proc.process_name || ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Process Code</label>
                        <input value={proc.process_code || ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Capacity Requirement (minutes)</label>
                        <input value={proc.capacity_requirement_minutes ?? ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Company</label>
                        <input value={companiesMap[String(proc.company_id)] || proc.company?.name || '-'} disabled />
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
                    <div className="form-group full">
                      <RichTextEditor
                        label="Process Overview"
                        value={proc.process_overview || ''}
                        readOnly
                        height={220}
                      />
                    </div>
                  </div>
                )
              },
              {
                id: 'workflow',
                label: 'Workflow',
                content: (
                  <div className="role-card">
                    <div className="section-title" style={{ marginBottom: 12, fontWeight: 600 }}>
                      Tasks in Workflow {workflowRows?.length ? `(${workflowRows.length})` : ''}
                    </div>
                    <div className="roles-table">
                      <div className="roles-table-header" style={{ gridTemplateColumns: '2.2fr 2.2fr 0.6fr' }}>
                        <div className="cell">Task</div>
                        <div className="cell">Jobs</div>
                        <div className="cell">Order</div>
                      </div>
                      {workflowRows.length === 0 ? (
                        <div className="no-results">No tasks in this workflow</div>
                      ) : workflowRows.map((row, idx) => {
                        const jobChips = (row.jobs || []).map(j => (
                          <span
                            key={j.job_id}
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              background: '#eef2ff',
                              color: '#3730a3',
                              borderRadius: 9999,
                              fontSize: 12,
                              marginRight: 6,
                              marginBottom: 6,
                              border: '1px solid #e5e7eb',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {j.name} {j.jobCode || j.job_code || j.code ? `- ${j.jobCode || j.job_code || j.code}` : ''}
                          </span>
                        ));
                        return (
                          <div
                            key={`${row.task.task_id || idx}`}
                            className="roles-table-row"
                            style={{ gridTemplateColumns: '2.2fr 2.2fr 0.6fr' }}
                          >
                            <div className="cell">
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{row.task.task_name || '-'}</span>
                                {row.task.task_code && (
                                  <span style={{ color: '#6b7280', fontSize: 12 }}>[{row.task.task_code}]</span>
                                )}
                              </div>
                            </div>
                            <div className="cell">
                              {jobChips?.length ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                  {jobChips}
                                </div>
                              ) : (
                                <span style={{ color: '#6b7280' }}>-</span>
                              )}
                            </div>
                            <div className="cell">
                              <span
                                style={{
                                  display: 'inline-block',
                                  minWidth: 28,
                                  textAlign: 'center',
                                  padding: '4px 8px',
                                  background: '#f3f4f6',
                                  borderRadius: 8,
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                {row.order ?? '-'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

export default ProcessViewPage;
