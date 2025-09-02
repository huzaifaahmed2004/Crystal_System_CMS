import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import { useAppContext } from '../context/AppContext';
import { createJob } from '../services/jobService';
import { getCompaniesLite } from '../services/layoutService';
import { getFunctions } from '../services/functionService';
import RichTextEditor from '../components/ui/RichTextEditor';
import SideTabs from '../components/layout/SideTabs';
import SkillTable from '../components/ui/SkillTable';
import SkillAddModal from '../components/ui/SkillAddModal';
import { LEVELS } from '../components/ui/levels';

const emptySkill = { name: '', level: '' };

const JobCreatePage = () => {
  const { setActiveSection } = useAppContext();

  const [companies, setCompanies] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [showAddSkill, setShowAddSkill] = useState(false);

  const [form, setForm] = useState({
    jobCode: '',
    name: '',
    description: '',
    company_id: '',
    function_id: '',
    hourlyRate: '',
    maxHoursPerDay: '',
    jobLevel: '', // string from LEVELS.name
    skills: [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [cs, fs] = await Promise.all([
          getCompaniesLite().catch(() => []),
          getFunctions().catch(() => []),
        ]);
        setCompanies(Array.isArray(cs) ? cs : []);
        setFunctions(Array.isArray(fs) ? fs : []);
      } catch (e) {
        // already handled by catch above; keep page usable
      }
    })();
  }, []);

  const onBack = () => setActiveSection('job-management');

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const setJobLevelByName = (name) => setForm(prev => ({ ...prev, jobLevel: name || '' }));
  const setJobLevelByRank = (rank) => {
    const r = Number(rank);
    const match = LEVELS.find(l => l.rank === r);
    setForm(prev => ({ ...prev, jobLevel: match ? match.name : '' }));
  };

  const updateSkill = (index, updater) => {
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
      await createJob(payload);
      setActiveSection('job-management');
    } catch (e) {
      setError(e?.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Create Job</h2>
            <p className="page-subtitle">Fill in job info, select one job level, and add multiple skills</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={onBack}>Cancel</button>
            <button className="primary-btn" onClick={onSubmit} disabled={!canSave || saving}>
              {saving ? 'Saving...' : 'Save Job'}
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
                  <div className="section-title" style={{ marginBottom: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Skills</span>
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
      </div>
    </div>
  );
};

export default JobCreatePage;
