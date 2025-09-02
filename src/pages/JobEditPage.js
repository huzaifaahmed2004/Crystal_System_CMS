import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { getCompaniesLite } from '../services/layoutService';
import { getFunctions } from '../services/functionService';
import { getJobWithRelations, updateJob } from '../services/jobService';
import RichTextEditor from '../components/ui/RichTextEditor';
import SideTabs from '../components/layout/SideTabs';

// Fixed level mapping (same as create page)
const LEVELS = [
  { rank: 1, name: 'NOVICE', description: 'Beginner, requires supervision' },
  { rank: 2, name: 'INTERMEDIATE', description: 'Can perform with some guidance' },
  { rank: 3, name: 'PROFICIENT', description: 'Independent, solid contributor' },
  { rank: 4, name: 'ADVANCED', description: 'Expert in most scenarios' },
  { rank: 5, name: 'EXPERT', description: 'Authority, mentor, innovator' },
];

const emptySkill = { name: '', level: '' };

const JobEditPage = () => {
  const { jobId, setJobId, setActiveSection } = useAppContext();

  const [companies, setCompanies] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    jobCode: '',
    name: '',
    description: '',
    company_id: '',
    function_id: '',
    hourlyRate: '',
    maxHoursPerDay: '',
    jobLevel: '',
    skills: [],
  });

  // fetch lists and job
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [cs, fs] = await Promise.all([
          getCompaniesLite().catch(() => []),
          getFunctions().catch(() => []),
        ]);
        setCompanies(Array.isArray(cs) ? cs : []);
        setFunctions(Array.isArray(fs) ? fs : []);

        let id = jobId;
        if (!id) {
          try {
            const stored = localStorage.getItem('activeJobId');
            if (stored) {
              id = stored;
              setJobId(stored);
            }
          } catch {}
        }
        if (!id) throw new Error('Missing job id');

        const data = await getJobWithRelations(id);
        if (data) {
          setForm({
            jobCode: data.jobCode || data.job_code || '',
            name: data.name || '',
            description: data.description || '',
            company_id: data.company_id != null ? String(data.company_id) : '',
            function_id: data.function_id != null ? String(data.function_id) : '',
            hourlyRate: data.hourlyRate != null ? String(data.hourlyRate) : '',
            maxHoursPerDay: data.maxHoursPerDay != null ? String(data.maxHoursPerDay) : '',
            jobLevel: data.jobLevel || data.job_level?.level_name || '',
            skills: Array.isArray(data.jobSkills)
              ? data.jobSkills.map(js => ({
                  name: js?.skill?.name || '',
                  level: js?.skill_level?.level_name || '',
                }))
              : [],
          });
        }
      } catch (e) {
        setError(e?.message || 'Failed to load job');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, setJobId]);

  const onBack = () => setActiveSection('job-management');
  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const updateSkillAt = (index, updater) => {
    setForm(prev => {
      const next = [...prev.skills];
      next[index] = updater(next[index]);
      return { ...prev, skills: next };
    });
  };
  const addSkill = () => setForm(prev => ({ ...prev, skills: [...prev.skills, { ...emptySkill }] }));
  const removeSkill = (index) => setForm(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));

  const canSave = useMemo(() => {
    return (
      String(form.name).trim() &&
      String(form.jobCode).trim() &&
      String(form.company_id) &&
      String(form.function_id) &&
      String(form.jobLevel)
    );
  }, [form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;
    try {
      setSaving(true);
      setError('');
      // determine id
      let id = jobId;
      if (!id) {
        try { id = localStorage.getItem('activeJobId') || id; } catch {}
      }
      if (!id) throw new Error('Missing job id');

      const payload = {
        jobCode: form.jobCode,
        name: form.name,
        description: form.description,
        company_id: form.company_id,
        function_id: form.function_id,
        hourlyRate: form.hourlyRate === '' ? null : Number(form.hourlyRate),
        maxHoursPerDay: form.maxHoursPerDay === '' ? null : Number(form.maxHoursPerDay),
        jobLevel: form.jobLevel,
        skills: (form.skills || [])
          .filter(s => String(s.name).trim() && String(s.level))
          .map(s => ({ name: s.name.trim(), level: s.level })),
      };
      await updateJob(id, payload);
      setActiveSection('job-management');
    } catch (e) {
      setError(e?.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content"><div className="no-results">Loading...</div></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Edit Job</h2>
            <p className="page-subtitle">Update job info, level, description, and skills</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={onBack}>Cancel</button>
            <button className="primary-btn" onClick={onSubmit} disabled={!canSave || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}

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
                      <label>Job Name</label>
                      <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Customer Onboarding" />
                    </div>
                    <div className="form-group">
                      <label>Job Code</label>
                      <input value={form.jobCode} onChange={e => setField('jobCode', e.target.value)} placeholder="e.g. JOB-001" />
                    </div>
                    <div className="form-group">
                      <label>Hourly Rate</label>
                      <input type="number" value={form.hourlyRate} onChange={e => setField('hourlyRate', e.target.value)} placeholder="e.g. 25" />
                    </div>
                    <div className="form-group">
                      <label>Max Hours Per Day</label>
                      <input
                        type="number"
                        min={0}
                        max={8}
                        step={1}
                        value={form.maxHoursPerDay}
                        onChange={e => {
                          const v = e.target.value === '' ? '' : Math.max(0, Math.min(8, Number(e.target.value)));
                          setField('maxHoursPerDay', v);
                        }}
                        placeholder="e.g. 8"
                      />
                      <small className="hint">Allowed range: 0 to 8 hours</small>
                    </div>
                    <div className="form-group">
                      <label>Function</label>
                      <select value={form.function_id} onChange={e => setField('function_id', e.target.value)}>
                        <option value="">Select Function</option>
                        {functions.map(f => (
                          <option key={f.function_id} value={f.function_id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Company</label>
                      <select value={form.company_id} onChange={e => setField('company_id', e.target.value)}>
                        <option value="">Select Company</option>
                        {companies.map(c => (
                          <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Level Name</label>
                      <select value={form.jobLevel} onChange={e => setField('jobLevel', e.target.value)}>
                        <option value="">Select Level Name</option>
                        {LEVELS.map(l => (
                          <option key={l.name} value={l.name}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Level Rank</label>
                      <select value={(LEVELS.find(l => l.name === form.jobLevel)?.rank) || ''} onChange={e => setField('jobLevel', (LEVELS.find(l => l.rank === Number(e.target.value))?.name) || '')}>
                        <option value="">Select Rank</option>
                        {LEVELS.map(l => (
                          <option key={l.rank} value={l.rank}>{l.rank}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group full">
                      <label>Level Description</label>
                      <input disabled value={LEVELS.find(l => l.name === form.jobLevel)?.description || ''} />
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
                  <RichTextEditor label="Job Description" value={form.description} onChange={val => setField('description', val)} height={280} />
                </div>
              )
            },
            {
              id: 'skills',
              label: 'Skills',
              content: (
                <div className="role-card">
                  <div className="section-title" style={{ marginBottom: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Skills</span>
                    <button className="primary-btn add-skill-btn icon-only" type="button" onClick={addSkill} title="Add Skill" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, minWidth: 36, padding: 0, lineHeight: 1 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  {(!form.skills || form.skills.length === 0) && (
                    <div className="no-results" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <span>No skills added yet</span>
                    </div>
                  )}

                  {form.skills.map((s, idx) => (
                    <div key={idx} className="role-card" style={{ background: '#fafafa', border: '1px solid #f3f4f6', marginBottom: 12 }}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Skill Name</label>
                          <input value={s.name || ''} onChange={e => updateSkillAt(idx, prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Machine Operation" />
                        </div>
                        <div className="form-group">
                          <label>Level Name</label>
                          <select value={s.level || ''} onChange={e => updateSkillAt(idx, prev => ({ ...prev, level: e.target.value }))}>
                            <option value="">Select Level Name</option>
                            {LEVELS.map(l => (
                              <option key={l.name} value={l.name}>{l.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Level Rank</label>
                          <select value={(LEVELS.find(l => l.name === s.level)?.rank) || ''} onChange={e => updateSkillAt(idx, prev => ({ ...prev, level: (LEVELS.find(l => l.rank === Number(e.target.value))?.name) || '' }))}>
                            <option value="">Select Rank</option>
                            {LEVELS.map(l => (
                              <option key={l.rank} value={l.rank}>{l.rank}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group full">
                          <label>Level Description</label>
                          <input disabled value={LEVELS.find(l => l.name === s.level)?.description || ''} />
                        </div>
                        <div className="form-group full" style={{ textAlign: 'right' }}>
                          <button className="danger-btn sm" type="button" onClick={() => removeSkill(idx)} disabled={form.skills.length <= 1}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default JobEditPage;
