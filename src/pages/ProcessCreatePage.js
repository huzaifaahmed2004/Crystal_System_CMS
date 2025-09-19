import React from 'react';
import '../styles/role-management.css';
import '../styles/job-detail.css';
import SideTabs from '../components/layout/SideTabs';
import { useAppContext } from '../context/AppContext';
import { getCompaniesLite } from '../services/layoutService';
import { createProcess } from '../services/processService';
import { getTasks, getTaskWithRelations } from '../services/taskService';
import { getJobs } from '../services/jobService';
import RichTextEditor from '../components/ui/RichTextEditor';

const ProcessCreatePage = () => {
  const { setActiveSection } = useAppContext();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [companies, setCompanies] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [workflowJobs, setWorkflowJobs] = React.useState([]); // per-row jobs for display

  const [form, setForm] = React.useState({
    process_name: '',
    process_code: '',
    company_id: '',
    process_overview: '',
  });
  const [workflow, setWorkflow] = React.useState([]); // rows: { task_id, job_id }

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [cList, tList, jList] = await Promise.all([
          getCompaniesLite().catch(() => []),
          getTasks().catch(() => []),
          getJobs().catch(() => []),
        ]);
        setCompanies(Array.isArray(cList) ? cList : []);
        setTasks(Array.isArray(tList) ? tList : []);
        setJobs(Array.isArray(jList) ? jList : []);
      } catch (e) {
        setError(e?.message || 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onBack = () => setActiveSection('process-management');

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addWorkflowRow = () => {
    setWorkflow(prev => ([...prev, { task_id: '', job_id: '' }]));
    setWorkflowJobs(prev => ([...(Array.isArray(prev) ? prev : []), []]));
  };

  const removeWorkflowRow = (index) => {
    setWorkflow(prev => prev.filter((_, i) => i !== index));
    setWorkflowJobs(prev => (Array.isArray(prev) ? prev.filter((_, i) => i !== index) : []));
  };

  const updateWorkflowRow = (index, key, value) => {
    setWorkflow(prev => prev.map((row, i) => i === index ? { ...row, [key]: value } : row));
  };

  // When a task is selected, auto-pick the first prelinked job (if any)
  const handleTaskSelect = async (index, taskId) => {
    // Update task_id immediately
    setWorkflow(prev => prev.map((row, i) => i === index ? { ...row, task_id: taskId, job_id: '' } : row));
    const idNum = Number(taskId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    // Try to find jobs from cached tasks list first
    const cached = (tasks || []).find(t => Number(t.task_id || t.id) === idNum);
    let jobsForTask = Array.isArray(cached?.jobTasks) ? cached.jobTasks.map(jt => jt?.job).filter(Boolean) : [];
    let firstJobId = jobsForTask[0]?.job_id ?? null;
    if (!jobsForTask.length) {
      // Fetch relations on-demand if cache lacks jobTasks
      try {
        const rel = await getTaskWithRelations(idNum);
        jobsForTask = Array.isArray(rel?.jobTasks) ? rel.jobTasks.map(x => x?.job).filter(Boolean) : [];
        firstJobId = jobsForTask[0]?.job_id ?? null;
      } catch (_) {
        // ignore errors; leave empty
      }
    }
    // Update visible jobs for this row
    setWorkflowJobs(prev => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      copy[index] = jobsForTask;
      return copy;
    });
    // Keep backend contract: store first job id if present
    if (firstJobId != null) {
      setWorkflow(prev => prev.map((row, i) => i === index ? { ...row, job_id: String(firstJobId) } : row));
    }
  };

  const moveWorkflowRowUp = (index) => {
    if (index <= 0) return;
    setWorkflow(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setWorkflowJobs(prev => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const tmp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = tmp;
      return arr;
    });
  };

  const moveWorkflowRowDown = (index) => {
    setWorkflow(prev => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setWorkflowJobs(prev => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      if (index >= arr.length - 1) return arr;
      const tmp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = tmp;
      return arr;
    });
  };

  const validate = () => {
    if (!form.process_name.trim()) return 'Process Name is required';
    if (!form.process_code.trim()) return 'Process Code is required';
    if (!form.company_id) return 'Company is required';
    if (!Array.isArray(workflow) || workflow.length === 0) return 'At least one workflow row is required';
    for (const [i, r] of workflow.entries()) {
      if (!r.task_id) return `Row ${i + 1}: Task is required`;
      if (!r.job_id) return `Row ${i + 1}: Job is required`;
    }
    return '';
  };

  const onSave = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const payload = {
        process_name: form.process_name,
        process_code: form.process_code,
        company_id: Number(form.company_id),
        process_overview: form.process_overview,
        workflow: workflow.map((r, idx) => ({
          task_id: Number(r.task_id),
          job_id: Number(r.job_id),
          order: idx + 1,
        })),
      };
      await createProcess(payload);
      setSuccess('Process created successfully');
      // Navigate back to list after a short delay
      setTimeout(() => setActiveSection('process-management'), 600);
    } catch (e) {
      setError(e?.message || 'Failed to create process');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Create Process</h2>
            <p className="page-subtitle">Define basic details and workflow, then save.</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={onBack} disabled={saving}>Back</button>
            <button className="primary-btn" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        {loading ? (
          <div className="no-results">Loading...</div>
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
                        <input value={form.process_name} onChange={e => handleChange('process_name', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Process Code</label>
                        <input value={form.process_code} onChange={e => handleChange('process_code', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Company</label>
                        <select value={form.company_id} onChange={e => handleChange('company_id', e.target.value)}>
                          <option value="">Select company</option>
                          {companies.map(c => (
                            <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
                          ))}
                        </select>
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
                        value={form.process_overview}
                        onChange={(html) => handleChange('process_overview', html)}
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
                    <div className="section-title" style={{ marginBottom: 12, fontWeight: 600 }}>Tasks in Workflow</div>
                    <div style={{ overflowX: 'auto' }}>
                      <div className="roles-table" style={{ width: '100%' }}>
                        <div className="roles-table-header" style={{ gridTemplateColumns: '1fr 1fr 90px 200px' }}>
                          <div className="cell">Task</div>
                          <div className="cell">Job</div>
                          <div className="cell">Order</div>
                          <div className="cell" style={{ textAlign: 'right' }}>Actions</div>
                        </div>
                        {workflow.length === 0 ? (
                          <div className="no-results">No workflow rows. Click "Add Row" to start.</div>
                        ) : workflow.map((row, idx) => (
                          <div key={idx} className="roles-table-row" style={{ gridTemplateColumns: '1fr 1fr 90px 200px' }}>
                            <div className="cell">
                              <select style={{ width: '100%' }} value={row.task_id} onChange={e => handleTaskSelect(idx, e.target.value)}>
                                <option value="">Select task</option>
                                {tasks.map(t => (
                                  <option key={t.task_id || t.id} value={t.task_id || t.id}>
                                    {(t.task_name || t.name)} {t.task_code || t.code ? `- [${t.task_code || t.code}]` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="cell">
                              {Array.isArray(workflowJobs[idx]) && workflowJobs[idx].length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                  {workflowJobs[idx].map((j) => (
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
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#6b7280' }}>-</span>
                              )}
                            </div>
                            <div className="cell">
                              <span style={{ display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '4px 8px', background: '#f3f4f6', borderRadius: 6, border: '1px solid #e5e7eb' }}>{idx + 1}</span>
                            </div>
                            <div className="cell" style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 8, whiteSpace: 'nowrap' }}>
                                <button className="secondary-btn sm" onClick={() => moveWorkflowRowUp(idx)} disabled={idx === 0}>↑</button>
                                <button className="secondary-btn sm" onClick={() => moveWorkflowRowDown(idx)} disabled={idx === workflow.length - 1}>↓</button>
                                <button className="danger-btn sm" onClick={() => removeWorkflowRow(idx)}>Remove</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button className="secondary-btn" onClick={addWorkflowRow}>+ Add Row</button>
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

export default ProcessCreatePage;
