import React, { useMemo, useState } from 'react';
import '../styles/role-management.css';
import '../styles/job-detail.css';
import { useAppContext } from '../context/AppContext';
import { getCompaniesLite } from '../services/layoutService';
import { createTask, getTasks, addJobToTask } from '../services/taskService';
import { getJobs } from '../services/jobService';
import SideTabs from '../components/layout/SideTabs';
import RichTextEditor from '../components/ui/RichTextEditor';
import SkillTable from '../components/ui/SkillTable';
import SkillAddModal from '../components/ui/SkillAddModal';
import { LEVELS } from '../components/ui/levels';

const emptySkill = { name: '', level: '' };

const TaskCreatePage = () => {
  const { setActiveSection } = useAppContext();

  const [companies, setCompanies] = useState([]);
  const [companiesMap, setCompaniesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [existingCodes, setExistingCodes] = useState(new Set());
  const [allJobs, setAllJobs] = useState([]);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [jobToAdd, setJobToAdd] = useState('');

  const [form, setForm] = useState({
    task_name: '',
    task_code: '',
    task_company_id: '',
    task_capacity_minutes: '',
    task_overview: '',
    skills: [],
  });

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cs = await getCompaniesLite().catch(() => []);
        const companiesArr = Array.isArray(cs) ? cs : [];
        setCompanies(companiesArr);
        const cMap = {};
        companiesArr.forEach(c => { cMap[String(c.company_id || c.id)] = c.name; });
        setCompaniesMap(cMap);
        // Load tasks to check for duplicate codes
        const tasks = await getTasks().catch(() => []);
        const codes = new Set((Array.isArray(tasks) ? tasks : []).map(t => String(t.task_code || t.code || '').trim().toLowerCase()).filter(Boolean));
        setExistingCodes(codes);
        // Load jobs for association
        const jobs = await getJobs().catch(() => []);
        setAllJobs(Array.isArray(jobs) ? jobs : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const duplicateCode = useMemo(() => {
    const code = String(form.task_code).trim().toLowerCase();
    return code && existingCodes.has(code);
  }, [form.task_code, existingCodes]);

  const validate = React.useCallback((f) => {
    const v = { };
    if (!String(f.task_name).trim()) v.task_name = 'Task name is required';
    if (!String(f.task_code).trim()) v.task_code = 'Task code is required';
    else if (!/^[A-Za-z0-9\-_.]+$/.test(String(f.task_code))) v.task_code = 'Only letters, numbers, dash (-), underscore (_) and dot (.) are allowed';
    else if (duplicateCode) v.task_code = 'This task code already exists';
    if (!String(f.task_company_id)) v.task_company_id = 'Company is required';
    if (String(f.task_capacity_minutes).trim() !== '') {
      const n = Number(f.task_capacity_minutes);
      if (!Number.isFinite(n) || n < 0) v.task_capacity_minutes = 'Capacity must be a non-negative number';
    }
    return v;
  }, [duplicateCode]);

  React.useEffect(() => {
    setErrors(validate(form));
  }, [form, validate]);

  const canSave = useMemo(() => {
    const noErrors = !errors || Object.keys(errors).length === 0;
    return (
      noErrors &&
      String(form.task_name).trim() &&
      String(form.task_code).trim() &&
      String(form.task_company_id)
    );
  }, [form, errors]);

  const onBack = () => setActiveSection('task-management');

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    const currentErrors = validate(form);
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length > 0 || !canSave || saving) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        task_name: form.task_name,
        task_code: form.task_code,
        task_company_id: form.task_company_id === '' ? null : Number(form.task_company_id),
        task_capacity_minutes: form.task_capacity_minutes === '' ? null : Number(form.task_capacity_minutes),
        task_overview: form.task_overview,
        // Send as per backend contract
        job_ids: (selectedJobIds || []).map(Number),
        taskSkills: (form.skills || [])
          .filter(s => String(s.name).trim() && String(s.level))
          .map(s => ({ skill_name: s.name.trim(), level: s.level })),
      };
      const created = await createTask(payload);
      // Resolve created task id
      let createdId = created?.task_id ?? created?.id;
      if (!createdId) {
        // Fallback: fetch by code
        try {
          const fresh = await getTasks();
          const found = (Array.isArray(fresh) ? fresh : []).find(t => String(t.task_code || '').toLowerCase() === String(form.task_code).trim().toLowerCase());
          if (found) createdId = found.task_id || found.id;
        } catch {}
      }
      // No need to associate jobs separately; job_ids were sent in create payload
      setActiveSection('task-management');
    } catch (e2) {
      setError(e2?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Create Task</h2>
            <p className="page-subtitle">Add a new task with basic details and required skills</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={onBack}>Cancel</button>
            <button className="primary-btn" onClick={onSubmit} disabled={!canSave || saving}>
              {saving ? 'Saving...' : 'Create Task'}
            </button>
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
                        <input
                          value={form.task_name}
                          onChange={e => setField('task_name', e.target.value)}
                          placeholder="e.g. Assemble Machine"
                        />
                      </div>
                      <div className="form-group">
                        <label>Task Code *</label>
                        <input
                          value={form.task_code}
                          onChange={e => setField('task_code', e.target.value)}
                          placeholder="e.g. AS-MCH-002"
                        />
                      </div>
                      <div className="form-group">
                        <label>Capacity (minutes)</label>
                        <input
                          type="number"
                          min={0}
                          value={form.task_capacity_minutes}
                          onChange={e => setField('task_capacity_minutes', e.target.value)}
                          placeholder="e.g. 30"
                        />
                      </div>
                      <div className="form-group">
                        <label>Company *</label>
                        <select
                          value={form.task_company_id}
                          onChange={e => setField('task_company_id', e.target.value)}
                        >
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
                    <RichTextEditor
                      label="Task Description"
                      value={form.task_overview}
                      onChange={val => setField('task_overview', val)}
                      height={280}
                    />
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
                            {(allJobs || [])
                              .filter(j => !selectedJobIds.includes(j.job_id))
                              .map(j => (
                                <option key={j.job_id} value={j.job_id}>{j.name} ({j.jobCode || j.job_code})</option>
                              ))}
                          </select>
                          <button className="primary-btn" type="button" onClick={() => {
                            if (!jobToAdd) return;
                            const id = Number(jobToAdd);
                            if (!selectedJobIds.includes(id)) setSelectedJobIds(prev => [...prev, id]);
                            setJobToAdd('');
                          }} disabled={!jobToAdd}>Add</button>
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
                      {selectedJobIds.length === 0 ? (
                        <div className="no-results">No jobs selected</div>
                      ) : (
                        selectedJobIds.map(id => {
                          const j = (allJobs || []).find(x => String(x.job_id) === String(id));
                          if (!j) return null;
                          return (
                            <div key={id} className="roles-table-row" style={{ gridTemplateColumns: '1.8fr 1.2fr 1.2fr 140px' }}>
                              <div className="cell">{j.name || '-'}</div>
                              <div className="cell">{j.jobCode || j.job_code || '-'}</div>
                              <div className="cell">{companiesMap[String(j.company_id)] || j.company?.name || '-'}</div>
                              <div className="cell actions" style={{ textAlign: 'right' }}>
                                <button className="danger-btn sm" type="button" onClick={() => setSelectedJobIds(prev => prev.filter(x => String(x) !== String(id)))}>Remove</button>
                              </div>
                            </div>
                          );
                        })
                      )}
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

export default TaskCreatePage;
