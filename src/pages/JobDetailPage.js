import React, { useEffect, useMemo, useState } from 'react';
import '../styles/role-management.css';
import '../styles/job-detail.css';
import { useAppContext } from '../context/AppContext';
import { getJobWithRelations } from '../services/jobService';
import RichTextEditor from '../components/ui/RichTextEditor';
import SideTabs from '../components/layout/SideTabs';

const JobDetailPage = () => {
  const { jobId, setJobId, setActiveSection } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
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
        const res = id ? await getJobWithRelations(id) : null;
        setData(res);
      } catch (e) {
        setError(e?.message || 'Failed to load job');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, setJobId]);

  const goBack = () => {
    try { localStorage.removeItem('activeJobId'); } catch {}
    setActiveSection('job-management');
  };

  const companyName = useMemo(() => data?.company?.name || data?.company_name || '-', [data]);
  const functionName = useMemo(() => data?.function?.name || data?.function_name || '-', [data]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Job Details</h2>
            <p className="page-subtitle">Read-only view of a job and its relations</p>
          </div>
          <div className="roles-toolbar">
            <button className="secondary-btn" onClick={goBack}>← Back</button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="no-results">Loading...</div>
        ) : !data ? (
          <div className="no-results">Job not found</div>
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
                        <label>Job Name</label>
                        <input value={data.name || ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Job Code</label>
                        <input value={data.jobCode || data.job_code || ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Hourly Rate</label>
                        <input value={data.hourlyRate != null ? String(data.hourlyRate) : ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Max Hours Per Day</label>
                        <input value={data.maxHoursPerDay != null ? String(data.maxHoursPerDay) : ''} disabled />
                      </div>
                      <div className="form-group">
                        <label>Function</label>
                        <input value={functionName} disabled />
                      </div>
                      <div className="form-group">
                        <label>Company</label>
                        <input value={companyName} disabled />
                      </div>
                      <div className="form-group">
                        <label>Level Name</label>
                        <input value={(data.job_level?.level_name) || '-'} disabled />
                      </div>
                      <div className="form-group">
                        <label>Level Rank</label>
                        <input value={(data.job_level?.level_rank != null ? String(data.job_level.level_rank) : '')} disabled />
                      </div>
                      <div className="form-group full">
                        <label>Level Description</label>
                        <input value={(data.job_level?.description) || ''} disabled />
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
                    <RichTextEditor label="Job Description" value={data.description || ''} readOnly height={280} />
                  </div>
                )
              },
              {
                id: 'skills',
                label: 'Skills',
                content: (
                  <div className="role-card">
                    <div className="section-title" style={{ marginBottom: 12, fontWeight: 600 }}>Skills</div>
                    {Array.isArray(data.jobSkills) && data.jobSkills.length ? (
                      <div className="skills-list">
                        {data.jobSkills.map((js, idx) => (
                          <div key={`${js.skill_id || idx}`} className="skill-card">
                            <div className="skill-header">
                              <div className="skill-name">{js.skill?.name || '-'}</div>
                              <div className="skill-level">{js.skill_level?.level_name || '-'}</div>
                            </div>
                            <div className="skill-body">
                              <div className="info-item"><span className="label">Skill Description</span><span className="value">{js.skill?.description || '-'}</span></div>
                              <div className="info-item"><span className="label">Level Rank</span><span className="value">{js.skill_level?.level_rank != null ? js.skill_level.level_rank : '-'}</span></div>
                              <div className="info-item"><span className="label">Level Description</span><span className="value">{js.skill_level?.description || '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-results" style={{ margin: 0 }}>No skills assigned</div>
                    )}
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

export default JobDetailPage;
