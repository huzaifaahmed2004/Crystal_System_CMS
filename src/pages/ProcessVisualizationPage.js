import React from 'react';
import '../styles/process-optimization.css';
import { getProcessesWithRelations, getProcessWithRelations } from '../services/processService';
import { getProcessGraphImage, getProcessSequenceImage } from '../services/processCreationService';
import { getFunctions } from '../services/functionService';

const ProcessVisualizationPage = () => {
  const [loading, setLoading] = React.useState(false);
  const [processes, setProcesses] = React.useState([]);
  const [labelToId, setLabelToId] = React.useState(new Map());
  const inputRef = React.useRef(null);
  const [selectedId, setSelectedId] = React.useState(null);

  const [graphUrl, setGraphUrl] = React.useState('');
  const [seqUrl, setSeqUrl] = React.useState('');
  const [graphZoom, setGraphZoom] = React.useState(1);
  const [seqZoom, setSeqZoom] = React.useState(1);
  const [functionNameById, setFunctionNameById] = React.useState(new Map());
  // Slider state for visualization: 0 = graph, 1 = sequence
  const [vizSlide, setVizSlide] = React.useState(0);
  const [vizZoom, setVizZoom] = React.useState([1, 1]);
  const [vizOffset, setVizOffset] = React.useState([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  const vizDragRef = React.useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 });

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getProcessesWithRelations();
        const funcs = await getFunctions();
        if (!mounted) return;
        const arr = Array.isArray(list) ? list : [];
        setProcesses(arr);
        const map = new Map();
        arr.forEach(p => {
          const label = `${p.process_name || p.name} (${p.company?.name || ''})`;
          const id = p.process_id || p.id;
          map.set(label, id);
        });
        setLabelToId(map);
        // Build function id -> name map for reliable naming
        const fMap = new Map();
        (Array.isArray(funcs) ? funcs : []).forEach(f => {
          const id = f?.function_id ?? f?.id; const nm = f?.name; if (id != null && nm) fMap.set(Number(id), nm);
        });
        setFunctionNameById(fMap);
      } catch (_) {
        if (mounted) {
          setProcesses([]);
          setLabelToId(new Map());
          setFunctionNameById(new Map());
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getSelectedId = () => {
    const v = inputRef.current?.value?.trim();
    if (!v) return null;
    if (labelToId.has(v)) return labelToId.get(v);
    const found = processes.find(p => String(p.process_id || p.id) === v);
    return found ? (found.process_id || found.id) : null;
  };

  const onInput = () => {
    const pid = getSelectedId();
    setSelectedId(pid);
  };

  const revokeUrls = () => {
    try { if (graphUrl) URL.revokeObjectURL(graphUrl); } catch (_) {}
    try { if (seqUrl) URL.revokeObjectURL(seqUrl); } catch (_) {}
    setGraphUrl('');
    setSeqUrl('');
  };

  const buildVisualizationPayloads = (proc) => {
    // Tasks ordered by process_task.order
    const pts = Array.isArray(proc?.process_tasks) ? proc.process_tasks : (Array.isArray(proc?.process_task) ? proc.process_task : []);
    const sorted = [...pts].sort((a,b) => (a?.order||0)-(b?.order||0));
    const tasks = sorted.map(pt => pt?.task?.task_name || pt?.task?.name || pt?.task_name || '').filter(Boolean);

    // Map task_id -> index in tasks
    const taskIdToIndex = new Map();
    sorted.forEach((pt, idx) => {
      const tid = pt?.task?.task_id ?? pt?.task_id;
      if (tid != null) taskIdToIndex.set(Number(tid), idx);
    });

    // Build jobs unique by job_id; collect task_indices from jobTasks
    const jobMap = new Map(); // job_id -> { name, task_indices: Set, function_id, function_name }
    sorted.forEach(pt => {
      const tid = pt?.task?.task_id ?? pt?.task_id;
      const tIndex = taskIdToIndex.has(Number(tid)) ? taskIdToIndex.get(Number(tid)) : null;
      const jts = Array.isArray(pt?.task?.jobTasks) ? pt.task.jobTasks : [];
      jts.forEach(link => {
        const job = link?.job || {};
        const jobId = job?.job_id ?? link?.job_id;
        if (jobId == null) return;
        const fnId = job?.function_id;
        const fnName = (fnId != null && functionNameById.has(Number(fnId))) ? functionNameById.get(Number(fnId)) : (job?.function?.name);
        if (!jobMap.has(jobId)) jobMap.set(jobId, { name: job?.name || job?.job_name || `Job ${jobId}` , task_indices: new Set(), function_id: fnId, function_name: fnName });
        if (tIndex != null) jobMap.get(jobId).task_indices.add(tIndex);
      });
    });
    const jobsArr = Array.from(jobMap.entries()).map(([jid, info], idx) => ({
      name: info.name,
      description: '',
      task_indices: Array.from(info.task_indices).sort((a,b)=>a-b),
      _function_id: info.function_id,
      _function_name: info.function_name,
      _index: idx,
    }));

    // Build functions by grouping jobs by function_id
    const funcMap = new Map(); // fid or name key -> { name, job_indices: [] }
    jobsArr.forEach((j, idx) => {
      const fid = j._function_id != null ? Number(j._function_id) : null;
      const fname = j._function_name || (fid != null ? (functionNameById.get(fid) || `Function ${fid}`) : null);
      if (fid == null && !fname) return; // skip if no grouping info
      const key = fid != null ? fid : `f-${fname}`;
      if (!funcMap.has(key)) funcMap.set(key, { name: fname || `Function ${key}`, job_indices: [] });
      funcMap.get(key).job_indices.push(idx);
    });
    const functionsArr = Array.from(funcMap.values()).map(f => ({ name: f.name, description: '', job_indices: f.job_indices }));

    const graphPayload = {
      process_name: proc?.process_name || proc?.name || 'Process',
      tasks: tasks.map(n => ({ name: n })),
      jobs: jobsArr.map(j => ({ name: j.name, description: '', task_indices: j.task_indices })),
      functions: functionsArr,
    };

    const seqPayload = {
      process_name: proc?.process_name || proc?.name || 'Process',
      tasks: tasks,
    };

    return { graphPayload, seqPayload };
  };

  const visualize = async () => {
    const pid = getSelectedId();
    if (!pid) return;
    setLoading(true);
    revokeUrls();
    try {
      const proc = await getProcessWithRelations(pid);
      const { graphPayload, seqPayload } = buildVisualizationPayloads(proc || {});
      const [g, s] = await Promise.all([
        getProcessGraphImage(graphPayload, 'png'),
        getProcessSequenceImage(seqPayload, 'png'),
      ]);
      setGraphUrl(g);
      setSeqUrl(s);
      setGraphZoom(1);
      setSeqZoom(1);
      // Reset slider state
      setVizSlide(0);
      setVizZoom([1, 1]);
      setVizOffset([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
    } catch (e) {
      alert(e?.message || 'Failed to visualize process');
    } finally {
      setLoading(false);
    }
  };

  const onFocusClear = () => {
    try { if (inputRef.current) inputRef.current.value = ''; } catch (_) {}
    setSelectedId(null);
    revokeUrls();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Process Visualization</h2>
            <p className="page-subtitle">Render process graph and sequence for any saved process</p>
          </div>
        </div>
      </div>

      <div className="page-content whatif">
        <div className="role-card">
          <div className="section-title">Select Process</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Process</label>
              <input list="pv-process-options" id="pv-process-search" ref={inputRef} className="input" placeholder="Search process by name/company" onInput={onInput} onFocus={onFocusClear} autoComplete="off" />
              <datalist id="pv-process-options">
                {processes.map((p, idx) => {
                  const label = `${p.process_name || p.name} (${p.company?.name || ''})`;
                  return <option value={label} key={idx} />
                })}
              </datalist>
            </div>
            <div className="form-group" style={{ alignSelf: 'end' }}>
              <button className="primary-btn" onClick={visualize} disabled={!selectedId || loading}>{loading ? 'Visualizing…' : 'Visualize'}</button>
            </div>
          </div>
        </div>

        {(graphUrl || seqUrl) && (
          <div className="role-card" style={{ marginTop: 12 }}>
            <div className="section-title">Visualization</div>
            <div className="po-slider" onMouseMove={(e) => {
              const d = vizDragRef.current; if (!d.active) return; const dx = e.clientX - d.startX; const dy = e.clientY - d.startY; setVizOffset((off) => { const noff = [...off]; noff[d.slide] = { x: d.baseX + dx, y: d.baseY + dy }; return noff; });
            }} onMouseUp={() => { vizDragRef.current = { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 }; }} onMouseLeave={() => { vizDragRef.current = { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 }; }}>
              <button className="slider-nav left" onClick={() => setVizSlide(s => (s + 1) % 2)} aria-label="Previous">‹</button>
              <div className="po-slides" style={{ height: vizSlide === 0 ? 300 : 120 }}>
                <div className="po-zoom-wrap" onMouseDown={(e) => { if (vizZoom[0] <= 1) return; vizDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: vizOffset[0].x, baseY: vizOffset[0].y, slide: 0 }; }} style={{ width: '100%', height: '100%', overflow: 'hidden', display: vizSlide === 0 ? 'block' : 'none', cursor: vizZoom[0] > 1 ? 'grab' : 'default' }}>
                  <img src={graphUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='} alt="Process Graph" className={`po-slide ${vizSlide === 0 ? 'active' : ''}`} style={{ transform: `translate(${vizOffset[0].x}px, ${vizOffset[0].y}px) scale(${vizZoom[0]})`, transformOrigin: 'center center' }} />
                </div>
                <div className="po-zoom-wrap" onMouseDown={(e) => { if (vizZoom[1] <= 1) return; vizDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: vizOffset[1].x, baseY: vizOffset[1].y, slide: 1 }; }} style={{ width: '100%', height: '100%', overflow: 'hidden', display: vizSlide === 1 ? 'block' : 'none', cursor: vizZoom[1] > 1 ? 'grab' : 'default' }}>
                  <img src={seqUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='} alt="Process Sequence" className={`po-slide ${vizSlide === 1 ? 'active' : ''}`} style={{ transform: `translate(${vizOffset[1].x}px, ${vizOffset[1].y}px) scale(${vizZoom[1]})`, transformOrigin: 'center center' }} />
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessVisualizationPage;
