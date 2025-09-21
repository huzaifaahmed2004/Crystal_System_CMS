import React, { useState } from 'react';
import '../styles/process-management.css';
import '../styles/process-optimization.css';
import Modal from '../components/ui/Modal';
import SideTabs from '../components/layout/SideTabs';
import { createProcessFromQuery, createProcessTasks, createTaskJobs, createJobFunctions, getProcessGraphImage, getProcessSequenceImage } from '../services/processCreationService';

const ProcessCreationPage = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { name, description }
  const [modal, setModal] = useState({ open: false, title: 'Notice', message: '' });
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [tasksResult, setTasksResult] = useState(null); // { task_names: string[], tasks: [{ name, description }] }
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
  const [creatingJobs, setCreatingJobs] = useState(false);
  const [jobsResult, setJobsResult] = useState(null); // { jobs: [{ name, description, task_indices: number[] }] }
  const [selectedJobIndex, setSelectedJobIndex] = useState(null);
  const [creatingFunctions, setCreatingFunctions] = useState(false);
  const [functionsResult, setFunctionsResult] = useState(null); // { functions: [{ name, description, job_indices: number[] }] }
  const [selectedFunctionIndex, setSelectedFunctionIndex] = useState(null);
  const [creatingVisualization, setCreatingVisualization] = useState(false);
  const [visualizationUrl, setVisualizationUrl] = useState(''); // graph PNG
  const [creatingSequence, setCreatingSequence] = useState(false);
  const [sequenceUrl, setSequenceUrl] = useState(''); // sequence PNG
  // Simple zoom controls for stacked images
  const [graphZoom, setGraphZoom] = useState(0.44);
  const [seqZoom, setSeqZoom] = useState(0.35);
  // Slider state for visualization: 0 = graph, 1 = sequence
  const [vizSlide, setVizSlide] = useState(0);
  const [vizZoom, setVizZoom] = useState([0.44, 0.35]);
  const [vizOffset, setVizOffset] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  const vizDragRef = React.useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 });

  const openModal = (title, message) => setModal({ open: true, title, message });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const q = query.trim();
    if (!q) { setError('Please enter a query.'); return; }
    try {
      setLoading(true);
      const res = await createProcessFromQuery(q);
      if (!res || !res.name || !res.description) {
        throw new Error('Unexpected response from server');
      }
      setResult({ name: res.name, description: res.description });
      openModal('Process Created', 'Process draft generated successfully. You can review the name and description below.');
    } catch (e1) {
      setError(e1?.message || 'Failed to create process');
    } finally {
      setLoading(false);
    }
  };

  const onCreateSequence = async () => {
    if (!result?.name || !tasksResult?.tasks) return;
    const payload = {
      process_name: result.name,
      tasks: (tasksResult.tasks || []).map(t => t?.name || '').filter(Boolean),
    };
    try {
      setCreatingSequence(true);
      try { if (sequenceUrl) URL.revokeObjectURL(sequenceUrl); } catch (_) {}
      const url = await getProcessSequenceImage(payload, 'png');
      setSequenceUrl(url);
      openModal('Sequence Ready', 'The process sequence image has been generated.');
    } catch (e) {
      setError(e?.message || 'Failed to generate sequence image');
    } finally {
      setCreatingSequence(false);
    }
  };

  const onCreateVisualization = async () => {
    if (!result?.name || !tasksResult?.tasks || !jobsResult?.jobs || !functionsResult?.functions) return;
    const graphPayload = {
      process_name: result.name,
      tasks: (tasksResult.tasks || []).map(t => ({ name: t?.name || '' })),
      jobs: (jobsResult.jobs || []).map(j => ({ name: j?.name || '', task_indices: Array.isArray(j?.task_indices) ? j.task_indices : [] })),
      functions: (functionsResult.functions || []).map(f => ({ name: f?.name || '', job_indices: Array.isArray(f?.job_indices) ? f.job_indices : [] })),
    };
    const sequencePayload = {
      process_name: result.name,
      tasks: (tasksResult.tasks || []).map(t => t?.name || '').filter(Boolean),
    };
    try {
      setCreatingVisualization(true);
      setCreatingSequence(true);
      // Revoke previous URLs if exists
      try { if (visualizationUrl) URL.revokeObjectURL(visualizationUrl); } catch (_) {}
      try { if (sequenceUrl) URL.revokeObjectURL(sequenceUrl); } catch (_) {}
      const [graphUrl, seqUrl] = await Promise.all([
        getProcessGraphImage(graphPayload, 'png'),
        getProcessSequenceImage(sequencePayload, 'png'),
      ]);
      setVisualizationUrl(graphUrl);
      setSequenceUrl(seqUrl);
      // Reset zooms to defaults after generating
      setGraphZoom(0.44);
      setSeqZoom(0.35);
      // Reset zoom/pan and show first slide
      setVizSlide(0);
      setVizZoom([1, 1]);
      setVizOffset([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
    } catch (e) {
      setError(e?.message || 'Failed to generate visualization');
    } finally {
      setCreatingVisualization(false);
      setCreatingSequence(false);
    }
  };

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      openModal('Copied', 'Text copied to clipboard');
    } catch (_) {
      openModal('Copy Failed', 'Unable to copy to clipboard.');
    }
  };

  const onReset = () => {
    setQuery('');
    setResult(null);
    setError('');
    setTasksResult(null);
    setSelectedTaskIndex(null);
    setJobsResult(null);
    setSelectedJobIndex(null);
    setFunctionsResult(null);
    setSelectedFunctionIndex(null);
    try { if (visualizationUrl) URL.revokeObjectURL(visualizationUrl); } catch (_) {}
    try { if (sequenceUrl) URL.revokeObjectURL(sequenceUrl); } catch (_) {}
    setVisualizationUrl('');
    setSequenceUrl('');
    setCreatingVisualization(false);
    setCreatingSequence(false);
    setGraphZoom(0.44);
    setSeqZoom(0.35);
  };

  const onCreateTasks = async () => {
    if (!result?.name || !result?.description) return;
    try {
      setCreatingTasks(true);
      const res = await createProcessTasks(result.name, result.description);
      const names = Array.isArray(res?.task_names) ? res.task_names : [];
      const tasks = Array.isArray(res?.tasks) ? res.tasks : [];
      setTasksResult({ task_names: names, tasks });
      setSelectedTaskIndex(tasks.length > 0 ? 0 : null);
      openModal('Tasks Generated', 'Process tasks have been generated successfully.');
    } catch (e) {
      setError(e?.message || 'Failed to create tasks');
    } finally {
      setCreatingTasks(false);
    }
  };

  const onCreateJobs = async () => {
    if (!result?.name || !result?.description || !tasksResult?.tasks) return;
    const payload = {
      process_name: result.name,
      process_description: result.description,
      tasks: (tasksResult.tasks || []).map(t => ({ name: t?.name || '', description: t?.description || '' }))
    };
    try {
      setCreatingJobs(true);
      const res = await createTaskJobs(payload);
      const jobs = Array.isArray(res?.jobs) ? res.jobs : [];
      setJobsResult({ jobs });
      setSelectedJobIndex(jobs.length > 0 ? 0 : null);
      openModal('Jobs Generated', 'Task jobs have been generated successfully.');
    } catch (e) {
      setError(e?.message || 'Failed to create jobs');
    } finally {
      setCreatingJobs(false);
    }
  };

  const onCreateFunctions = async () => {
    if (!result?.name || !result?.description || !tasksResult?.tasks || !jobsResult?.jobs) return;
    const payload = {
      process_name: result.name,
      process_description: result.description,
      tasks: (tasksResult.tasks || []).map(t => ({ name: t?.name || '', description: t?.description || '' })),
      jobs: (jobsResult.jobs || []).map(j => ({ name: j?.name || '', description: j?.description || '', task_indices: Array.isArray(j?.task_indices) ? j.task_indices : [] }))
    };
    try {
      setCreatingFunctions(true);
      const res = await createJobFunctions(payload);
      const functionsArr = Array.isArray(res?.functions) ? res.functions : [];
      setFunctionsResult({ functions: functionsArr });
      setSelectedFunctionIndex(functionsArr.length > 0 ? 0 : null);
      openModal('Functions Generated', 'Job functions have been generated successfully.');
    } catch (e) {
      setError(e?.message || 'Failed to create functions');
    } finally {
      setCreatingFunctions(false);
    }
  };

  return (
    <div className="page process-management">
      <div className="page-header">
        <div className="left">
          <h1>Process Creation</h1>
          <div className="subtitle">Work through the flow using the tabs. Tabs unlock as you complete steps.</div>
        </div>
      </div>

      <div className="page-content">
        {error && (<div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>)}

        <SideTabs
          defaultActiveId="process"
          disabledIds={[...(result ? [] : ['tasks']), ...(tasksResult ? [] : ['jobs']), ...(jobsResult ? [] : ['functions']), ...((visualizationUrl || sequenceUrl) ? [] : ['visualization'])]}
          tabs={[
            {
              id: 'process',
              label: 'Process',
              content: (
                <div className="role-card create-card" style={{ maxWidth: 960 }}>
                  <form onSubmit={onSubmit}>
                    <div className="field">
                      <label>Query</label>
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={5}
                        placeholder="Describe the process you want to create..."
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="primary-btn" type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Process'}
                      </button>
                      <button className="secondary-btn" type="button" onClick={onReset} disabled={loading}>
                        Reset
                      </button>
                    </div>
                  </form>

                  {result && (
                    <div style={{ marginTop: 16 }}>
                      <div className="section-title" style={{ marginBottom: 8 }}>Generated Result</div>
                      <div className="field">
                        <label>Name</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="text" value={result.name} readOnly style={{ flex: 1 }} />
                          <button className="secondary-btn" onClick={() => onCopy(result.name)}>Copy</button>
                        </div>
                      </div>
                      <div className="field">
                        <label>Description</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <textarea value={result.description} readOnly rows={14} style={{ flex: 1 }} />
                          <button className="secondary-btn" onClick={() => onCopy(result.description)}>Copy</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            },
            {
              id: 'tasks',
              label: 'Tasks',
              content: (
                <div className="role-card" style={{ maxWidth: 1040 }}>
                  {!tasksResult ? (
                    <div className="no-results">Generate a process first, then click Create Tasks to see the list below.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div>
                        <div className="section-title" style={{ marginBottom: 8 }}>Tasks</div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {(tasksResult.tasks || []).map((t, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedTaskIndex(i)}
                              className={`list-row ${selectedTaskIndex === i ? 'selected' : ''}`}
                              style={{
                                textAlign: 'left',
                                padding: '8px 12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                background: selectedTaskIndex === i ? '#f3f4f6' : 'white'
                              }}
                            >
                              {t?.name || `Task ${i + 1}`}
                            </button>
                          ))}
                          {(!tasksResult.tasks || tasksResult.tasks.length === 0) && (
                            <div className="no-results">No tasks returned.</div>
                          )}
                        </div>
                      </div>

                      {selectedTaskIndex != null && (tasksResult.tasks || [])[selectedTaskIndex] && (
                        <div className="role-card" style={{ padding: 12 }}>
                          <div className="section-title" style={{ marginBottom: 8 }}>Selected Task Details</div>
                          <div className="field">
                            <label>Name</label>
                            <input type="text" value={(tasksResult.tasks[selectedTaskIndex]?.name) || ''} readOnly />
                          </div>
                          <div className="field">
                            <label>Description</label>
                            <textarea value={(tasksResult.tasks[selectedTaskIndex]?.description) || ''} readOnly rows={12} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            },
            {
              id: 'jobs',
              label: 'Jobs',
              content: (
                <div className="role-card" style={{ maxWidth: 1040 }}>
                  <div className="section-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Jobs</span>
                    {!jobsResult && (
                      <button type="button" className="primary-btn sm" onClick={onCreateJobs} disabled={creatingJobs || !tasksResult}>
                        {creatingJobs ? 'Creating Jobs…' : 'Create Jobs'}
                      </button>
                    )}
                  </div>

                  {!tasksResult && !jobsResult && (
                    <div className="no-results">Generate tasks first, then click Create Jobs to see suggestions here.</div>
                  )}

                  {jobsResult && (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {(jobsResult.jobs || []).map((j, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedJobIndex(i)}
                            className={`list-row ${selectedJobIndex === i ? 'selected' : ''}`}
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: 8,
                              background: selectedJobIndex === i ? '#f3f4f6' : 'white'
                            }}
                          >
                            {j?.name || `Job ${i + 1}`}
                          </button>
                        ))}
                        {(!jobsResult.jobs || jobsResult.jobs.length === 0) && (
                          <div className="no-results">No jobs returned.</div>
                        )}
                      </div>

                      {selectedJobIndex != null && (jobsResult.jobs || [])[selectedJobIndex] && (
                        <div className="role-card" style={{ padding: 12 }}>
                          <div className="section-title" style={{ marginBottom: 8 }}>Selected Job Details</div>
                          <div className="field">
                            <label>Name</label>
                            <input type="text" value={(jobsResult.jobs[selectedJobIndex]?.name) || ''} readOnly />
                          </div>
                          <div className="field">
                            <label>Description</label>
                            <textarea value={(jobsResult.jobs[selectedJobIndex]?.description) || ''} readOnly rows={12} />
                          </div>
                          <div className="field">
                            <label>Task(s) Performed</label>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {((jobsResult.jobs[selectedJobIndex]?.task_indices) || []).map((idx, k) => (
                                <div key={k} className="list-row" style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                  {tasksResult?.tasks?.[idx]?.name || tasksResult?.task_names?.[idx] || `Task #${idx + 1}`}
                                </div>
                              ))}
                              {(!jobsResult.jobs[selectedJobIndex]?.task_indices || jobsResult.jobs[selectedJobIndex].task_indices.length === 0) && (
                                <div className="no-results">No related tasks listed.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            },
            {
              id: 'functions',
              label: 'Functions',
              content: (
                <div className="role-card" style={{ maxWidth: 1040 }}>
                  <div className="section-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Functions</span>
                    {!functionsResult && (
                      <button type="button" className="primary-btn sm" onClick={onCreateFunctions} disabled={creatingFunctions || !jobsResult}>
                        {creatingFunctions ? 'Creating Functions…' : 'Create Functions'}
                      </button>
                    )}
                  </div>

                  {!jobsResult && !functionsResult && (
                    <div className="no-results">Generate jobs first, then click Create Functions to see suggestions here.</div>
                  )}

                  {functionsResult && (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {(functionsResult.functions || []).map((f, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedFunctionIndex(i)}
                            className={`list-row ${selectedFunctionIndex === i ? 'selected' : ''}`}
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: 8,
                              background: selectedFunctionIndex === i ? '#f3f4f6' : 'white'
                            }}
                          >
                            {f?.name || `Function ${i + 1}`}
                          </button>
                        ))}
                        {(!functionsResult.functions || functionsResult.functions.length === 0) && (
                          <div className="no-results">No functions returned.</div>
                        )}
                      </div>

                      {selectedFunctionIndex != null && (functionsResult.functions || [])[selectedFunctionIndex] && (
                        <div className="role-card" style={{ padding: 12 }}>
                          <div className="section-title" style={{ marginBottom: 8 }}>Selected Function Details</div>
                          <div className="field">
                            <label>Name</label>
                            <input type="text" value={(functionsResult.functions[selectedFunctionIndex]?.name) || ''} readOnly />
                          </div>
                          <div className="field">
                            <label>Description</label>
                            <textarea value={(functionsResult.functions[selectedFunctionIndex]?.description) || ''} readOnly rows={12} />
                          </div>
                          <div className="field">
                            <label>Job(s) Linked</label>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {((functionsResult.functions[selectedFunctionIndex]?.job_indices) || []).map((idx, k) => (
                                <div key={k} className="list-row" style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                  {jobsResult?.jobs?.[idx]?.name || `Job #${idx + 1}`}
                                </div>
                              ))}
                              {(!functionsResult.functions[selectedFunctionIndex]?.job_indices || functionsResult.functions[selectedFunctionIndex].job_indices.length === 0) && (
                                <div className="no-results">No related jobs listed.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            },
            {
              id: 'visualization',
              label: 'Visualization',
              content: (
                <div className="role-card" style={{ maxWidth: 1040 }}>
                  <div className="section-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Process Visualization</span>
                    {!visualizationUrl && !sequenceUrl && (
                      <button type="button" className="primary-btn sm" onClick={onCreateVisualization} disabled={creatingVisualization || creatingSequence || !functionsResult}>
                        {(creatingVisualization || creatingSequence) ? 'Visualizing…' : 'Visualize'}
                      </button>
                    )}
                  </div>

                  {!functionsResult && !tasksResult && !visualizationUrl && !sequenceUrl && (
                    <div className="no-results">Generate tasks, jobs, and functions first, then click Visualize to render both images.</div>
                  )}

                  {(visualizationUrl || sequenceUrl) && (
                    <div className="po-slider" onMouseMove={(e) => {
                      const d = vizDragRef.current; if (!d.active) return; const dx = e.clientX - d.startX; const dy = e.clientY - d.startY; setVizOffset((off) => { const noff = [...off]; noff[d.slide] = { x: d.baseX + dx, y: d.baseY + dy }; return noff; });
                    }} onMouseUp={() => { vizDragRef.current = { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 }; }} onMouseLeave={() => { vizDragRef.current = { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 }; }}>
                      <button className="slider-nav left" onClick={() => setVizSlide(s => (s + 1) % 2)} aria-label="Previous">‹</button>
                      <div className="po-slides" style={{ height: vizSlide === 0 ? 300 : 120 }}>
                        <div className="po-zoom-wrap" onMouseDown={(e) => { if (vizZoom[0] <= 1) return; vizDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: vizOffset[0].x, baseY: vizOffset[0].y, slide: 0 }; }} style={{ width: '100%', height: '100%', overflow: 'hidden', display: vizSlide === 0 ? 'block' : 'none', cursor: vizZoom[0] > 1 ? 'grab' : 'default' }}>
                          <img src={visualizationUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='} alt="Process Graph" className={`po-slide ${vizSlide === 0 ? 'active' : ''}`} style={{ transform: `translate(${vizOffset[0].x}px, ${vizOffset[0].y}px) scale(${vizZoom[0]})`, transformOrigin: 'center center' }} />
                        </div>
                        <div className="po-zoom-wrap" onMouseDown={(e) => { if (vizZoom[1] <= 1) return; vizDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: vizOffset[1].x, baseY: vizOffset[1].y, slide: 1 }; }} style={{ width: '100%', height: '100%', overflow: 'hidden', display: vizSlide === 1 ? 'block' : 'none', cursor: vizZoom[1] > 1 ? 'grab' : 'default' }}>
                          <img src={sequenceUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='} alt="Process Sequence" className={`po-slide ${vizSlide === 1 ? 'active' : ''}`} style={{ transform: `translate(${vizOffset[1].x}px, ${vizOffset[1].y}px) scale(${vizZoom[1]})`, transformOrigin: 'center center' }} />
                        </div>
                      </div>
                      <button className="slider-nav right" onClick={() => setVizSlide(s => (s + 1) % 2)} aria-label="Next">›</button>
                      <div className="po-zoom-controls">
                        <button type="button" onClick={() => setVizZoom((z) => { const nz = [...z]; nz[vizSlide] = Math.max(0.1, Math.min(2, nz[vizSlide] - 0.05)); if (nz[vizSlide] === 0.1) setVizOffset((off) => { const noff = [...off]; noff[vizSlide] = { x: 0, y: 0 }; return noff; }); return nz; })} title="Zoom Out" aria-label="Zoom Out">−</button>
                        <span className="po-zoom-level">{Math.round(vizZoom[vizSlide] * 100)}%</span>
                        <button type="button" onClick={() => setVizZoom((z) => { const nz = [...z]; nz[vizSlide] = Math.max(0.1, Math.min(2, nz[vizSlide] + 0.05)); return nz; })} title="Zoom In" aria-label="Zoom In">+</button>
                        <button type="button" onClick={() => { setVizZoom((z) => { const nz = [...z]; nz[vizSlide] = vizSlide === 0 ? 1 : 1; return nz; }); setVizOffset((off) => { const noff = [...off]; noff[vizSlide] = { x: 0, y: 0 }; return noff; }); }} title="Reset" aria-label="Reset">Reset</button>
                      </div>
                      <div className="dots">
                        <button className={`dot ${vizSlide === 0 ? 'active' : ''}`} onClick={() => setVizSlide(0)} aria-label="Slide 1" />
                        <button className={`dot ${vizSlide === 1 ? 'active' : ''}`} onClick={() => setVizSlide(1)} aria-label="Slide 2" />
                      </div>
                    </div>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Floating Create button (Tasks first, then Jobs) */}
      {result && (!tasksResult || (tasksResult && !jobsResult) || (jobsResult && !functionsResult) || (functionsResult && !visualizationUrl)) && (
        <button
          type="button"
          className="primary-btn"
          onClick={() => (!tasksResult ? onCreateTasks() : (!jobsResult ? onCreateJobs() : (!functionsResult ? onCreateFunctions() : onCreateVisualization())))}
          disabled={!tasksResult ? creatingTasks : (!jobsResult ? creatingJobs : (!functionsResult ? creatingFunctions : creatingVisualization))}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            borderRadius: 999,
            padding: '12px 16px',
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)'
          }}
        >
          {!tasksResult
            ? (creatingTasks ? 'Creating Tasks…' : 'Create Tasks')
            : (!jobsResult
              ? (creatingJobs ? 'Creating Jobs…' : 'Create Jobs')
              : (!functionsResult
                ? (creatingFunctions ? 'Creating Functions…' : 'Create Functions')
                : (creatingVisualization ? 'Generating…' : 'Create Visualization')))}
        </button>
      )}

      <Modal open={modal.open} title={modal.title} onCancel={closeModal} cancelText="Close">
        {modal.message}
      </Modal>
    </div>
  );
}
;

export default ProcessCreationPage;
