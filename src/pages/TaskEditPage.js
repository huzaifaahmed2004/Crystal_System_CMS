import React from 'react';
import '../styles/role-management.css';
import '../styles/job-detail.css';
import { useAppContext } from '../context/AppContext';
import { getCompaniesLite } from '../services/layoutService';
import { getJobs } from '../services/jobService';
import { getTaskWithRelations, updateTask, addJobToTask, removeJobFromTask } from '../services/taskService';
import SideTabs from '../components/layout/SideTabs';
import RichTextEditor from '../components/ui/RichTextEditor';
import SkillTable from '../components/ui/SkillTable';
import SkillAddModal from '../components/ui/SkillAddModal';
import { LEVELS } from '../components/ui/levels';

const TaskEditPage = () => {
  const { setActiveSection } = useAppContext();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const [companies, setCompanies] = React.useState([]);
  const [allJobs, setAllJobs] = React.useState([]);
  const [availableJobs, setAvailableJobs] = React.useState([]);

  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState({
    task_name: '',
    task_code: '',
    task_company_id: '',
    task_capacity_minutes: '',
    task_overview: '',
    skills: [],
  });

  const [showAddSkill, setShowAddSkill] = React.useState(false);
  const [jobToAdd, setJobToAdd] = React.useState('');

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [companiesRes, jobsRes] = await Promise.all([
        getCompaniesLite().catch(() => []),
        getJobs().catch(() => []),
      ]);
      setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
      setAllJobs(Array.isArray(jobsRes) ? jobsRes : []);

      let id = null;
      try { id = localStorage.getItem('activeTaskId'); } catch {}
      if (!id) throw new Error('No active task selected');
      const res = await getTaskWithRelations(id);
      setData(res);

      const base = {
        task_name: res?.task_name || '',
        task_code: res?.task_code || '',
        task_company_id: res?.task_company_id ?? res?.company_id ?? '',
        task_capacity_minutes: res?.task_capacity_minutes ?? '',
        task_overview: res?.task_overview || '',
        skills: (Array.isArray(res?.taskSkills) ? res.taskSkills : []).map(ts => ({
          name: ts?.skill?.name || ts?.skill_name || '',
          level: ts?.level?.level_name || '',
        })),
      };
      setForm(base);

      const currentJobIds = new Set((Array.isArray(res?.jobTasks) ? res.jobTasks : []).map(jt => jt?.job?.job_id).filter(Boolean));
      const filtered = (Array.isArray(jobsRes) ? jobsRes : []).filter(j => !currentJobIds.has(j.job_id));
      setAvailableJobs(filtered);
    } catch (e) {
      setError(e?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const canSave = (
    String(form.task_name).trim() &&
    String(form.task_code).trim() &&
    String(form.task_company_id)
  );

  const onBack = () => setActiveSection('task-management');

  const onSave = async () => {
    if (!canSave || saving || !data?.task_id) return;
    try {
      setSaving(true);
      setError('');
      await updateTask(data.task_id, {
        task_name: form.task_name,
        task_code: form.task_code,
        task_company_id: form.task_company_id === '' ? null : Number(form.task_company_id),
        task_capacity_minutes: form.task_capacity_minutes === '' ? null : Number(form.task_capacity_minutes),
        task_overview: form.task_overview,
        // Backend expects taskSkills for patch; do not send 'skills' alongside
        taskSkills: (form.skills || [])
          .filter(s => s.name && s.level)
          .map(s => ({ skill_name: s.name, level: s.level })),
      });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const jobRows = React.useMemo(() => {
    return (Array.isArray(data?.jobTasks) ? data.jobTasks : [])
      .map(jt => jt?.job)
      .filter(Boolean);
  }, [data]);

  const handleAddJob = async () => {
    if (!jobToAdd || !data?.task_id) return;
    try {
      await addJobToTask(data.task_id, Number(jobToAdd));
      setJobToAdd('');
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to add job');
    }
  };

  const handleRemoveJob = async (jobId) => {
    if (!jobId || !data?.task_id) return;
    try {
      await removeJobFromTask(data.task_id, Number(jobId));
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to remove job');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Edit Task</h2>
            <p className="page-subtitle">Update task details, required skills, and associated jobs</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={onBack}>Back</button>
            <button className="primary-btn" onClick={onSave} disabled={!canSave || saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
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
                        <label>Task Name *</label>
                        <input value={form.task_name} onChange={e => setField('task_name', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Task Code *</label>
                        <input value={form.task_code} onChange={e => setField('task_code', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Capacity (minutes)</label>
                        <input type="number" min={0} value={form.task_capacity_minutes} onChange={e => setField('task_capacity_minutes', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Company *</label>
                        <select value={form.task_company_id} onChange={e => setField('task_company_id', e.target.value)}>
                          <option value="">Select Company</option>
                          {companies.map(c => (
                            <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group full">
                        <label>Associated Processes</label>
                        <div className="chip-list">
                          <span className="muted">Processes are managed elsewhere and are read-only here.</span>
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
                    <RichTextEditor label="Task Description" value={form.task_overview} onChange={val => setField('task_overview', val)} height={280} />
                  </div>
                )
              },
              {
                id: 'jobs',
                label: 'Jobs',
                content: (
                  <div className="role-card">
                    <div className="section-title" style={{ marginBottom: 12, fontWeight: 600 }}>Associated Jobs</div>
                    <div className="form-grid">
                      <div className="form-group" style={{ maxWidth: 420 }}>
                        <label>Add Job</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <select value={jobToAdd} onChange={e => setJobToAdd(e.target.value)} style={{ flex: 1 }}>
                            <option value="">Select job to add</option>
                            {availableJobs.map(j => (
                              <option key={j.job_id} value={j.job_id}>{j.name} ({j.jobCode || j.job_code})</option>
                            ))}
                          </select>
                          <button className="primary-btn" onClick={handleAddJob} disabled={!jobToAdd}>Add</button>
                        </div>
                      </div>
                    </div>
                    <div className="roles-table" style={{ marginTop: 8 }}>
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
                          <div className="cell">{j.company?.name || '-'}</div>
                          <div className="cell actions" style={{ textAlign: 'right' }}>
                            <button className="danger-btn sm" onClick={() => handleRemoveJob(j.job_id)}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              },
              {
                id: 'skills',
                label: 'Req Skills',
                content: (
                  <div className="role-card">
                    <div className="section-title" style={{ marginBottom: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Req Skills</span>
                      <button type="button" className="primary-btn icon-square" onClick={() => setShowAddSkill(true)} aria-label="Add Skill" title="Add Skill">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <SkillTable
                      mode="manage"
                      skills={form.skills}
                      levels={LEVELS}
                      onDelete={(idx) => setForm(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== idx) }))}
                    />
                    <SkillAddModal
                      open={showAddSkill}
                      onClose={() => setShowAddSkill(false)}
                      levels={LEVELS}
                      onSave={(s) => {
                        setForm(prev => ({ ...prev, skills: [...prev.skills, s] }));
                        setShowAddSkill(false);
                      }}
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

export default TaskEditPage;
