import React from 'react';
import '../styles/process-optimization.css';
import { getProcessesWithRelations, getProcessWithRelations } from '../services/processService';
import { getAllocPng, getSummaryPng } from '../services/processOptimizationService';
import FormModal from '../components/ui/FormModal';

const ProcessOptimizationPage = () => {
  const [loading, setLoading] = React.useState(false);
  const [processes, setProcesses] = React.useState([]);
  const [labelToId, setLabelToId] = React.useState(new Map());
  const inputRef = React.useRef(null);
  const [selectedId, setSelectedId] = React.useState(null);
  const [showResults, setShowResults] = React.useState(false);
  const [slide, setSlide] = React.useState(0);
  const [allocUrl, setAllocUrl] = React.useState('');
  const [summaryUrl, setSummaryUrl] = React.useState('');
  const [showMinTasksModal, setShowMinTasksModal] = React.useState(false);
  // Zoom & pan state per slide: index 0 = alloc, 1 = summary
  const [zoom, setZoom] = React.useState([1, 1]);
  const [offset, setOffset] = React.useState([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  const draggingRef = React.useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 });

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getProcessesWithRelations();
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
      } catch (_) {
        if (mounted) {
          setProcesses([]);
          setLabelToId(new Map());
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

  const onFocusClear = () => {
    // Clear the input value and reset selection so user can search fresh
    try {
      if (inputRef.current) inputRef.current.value = '';
    } catch (_) {}
    setSelectedId(null);
    setShowResults(false);
    // Revoke previous object URLs to release memory
    try { if (allocUrl) URL.revokeObjectURL(allocUrl); } catch (_) {}
    try { if (summaryUrl) URL.revokeObjectURL(summaryUrl); } catch (_) {}
    setAllocUrl('');
    setSummaryUrl('');
  };

  const optimize = async () => {
    const pid = getSelectedId();
    if (!pid) return;
    setLoading(true);
    // Revoke previous object URLs before creating new ones
    try { if (allocUrl) URL.revokeObjectURL(allocUrl); } catch (_) {}
    try { if (summaryUrl) URL.revokeObjectURL(summaryUrl); } catch (_) {}
    setAllocUrl('');
    setSummaryUrl('');
    try {
      // Guard: require at least 2 tasks in process; only block if we can CONFIDENTLY detect < 2
      const proc = await getProcessWithRelations(pid).catch(() => null);
      let tasksCount = 0; let confident = false;
      const wf = Array.isArray(proc?.workflow) ? proc.workflow : null;
      if (wf) {
        const ids = wf.map(w => w?.task_id).filter(Boolean);
        if (ids.length > 0) { tasksCount = new Set(ids).size; confident = true; }
        else if (wf.length > 0) { tasksCount = wf.length; confident = true; }
      }
      if (!confident && Array.isArray(proc?.tasks)) { tasksCount = proc.tasks.length; confident = true; }
      if (!confident && Array.isArray(proc?.process_tasks)) { tasksCount = proc.process_tasks.length; confident = true; }
      if (confident && tasksCount < 2) {
        setShowMinTasksModal(true);
        return;
      }
      const [alloc, summary] = await Promise.all([
        getAllocPng(pid),
        getSummaryPng(pid),
      ]);
      setAllocUrl(alloc);
      setSummaryUrl(summary);
      setShowResults(true);
      setSlide(0);
    } catch (e) {
      console.error('Failed to load optimization PNGs', e);
      alert(`Failed to load charts: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => setSlide(s => (s + 1) % 2);
  const prevSlide = () => setSlide(s => (s + 1) % 2); // 2 slides only, same behaviour

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const updateZoom = (which, delta) => {
    setZoom((z) => {
      const nz = [...z];
      nz[which] = clamp(nz[which] + delta, 1, 5);
      // If zoom goes back to 1, also reset pan for that slide
      if (nz[which] === 1) {
        setOffset((off) => {
          const noff = [...off];
          noff[which] = { x: 0, y: 0 };
          return noff;
        });
      }
      return nz;
    });
  };
  const resetZoom = (which) => {
    setZoom((z) => { const nz = [...z]; nz[which] = 1; return nz; });
    setOffset((off) => { const noff = [...off]; noff[which] = { x: 0, y: 0 }; return noff; });
  };

  const onMouseDown = (e, which) => {
    if (zoom[which] <= 1) return; // pan only when zoomed in
    draggingRef.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: offset[which].x, baseY: offset[which].y, slide: which };
  };
  const onMouseMove = (e) => {
    const d = draggingRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setOffset((off) => {
      const noff = [...off];
      noff[d.slide] = { x: d.baseX + dx, y: d.baseY + dy };
      return noff;
    });
  };
  const onMouseUp = () => { draggingRef.current = { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, slide: 0 }; };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2 className="page-title">Process Optimization</h2>
            <p className="page-subtitle">Explore optimization insights for your processes</p>
          </div>
        </div>
      </div>

      <div className="page-content whatif">
        <div className="role-card">
          <div className="section-title">Select Process</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Process</label>
              <input list="po-process-options" id="processSearch" ref={inputRef} className="input" placeholder="Search process by name/company" onInput={onInput} onFocus={onFocusClear} autoComplete="off" />
              <datalist id="po-process-options">
                {processes.map((p, idx) => {
                  const label = `${p.process_name || p.name} (${p.company?.name || ''})`;
                  return <option value={label} key={idx} />
                })}
              </datalist>
            </div>
            <div className="form-group" style={{ alignSelf: 'end' }}>
              <button className="primary-btn" onClick={optimize} disabled={!selectedId || loading}>{loading ? 'Optimizing…' : 'Optimize Process'}</button>
            </div>
          </div>
        </div>

        {showResults && (
          <div className="role-card" style={{ marginTop: 12 }}>
            <div className="section-title">Optimization Results</div>
            <div className="po-slider" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
              <button className="slider-nav left" onClick={prevSlide} aria-label="Previous">‹</button>
              <div className="po-slides" style={{ height: 560 }}>
                <div className="po-zoom-wrap" onMouseDown={(e) => onMouseDown(e, 0)} style={{ width: '100%', height: '100%', overflow: 'hidden', display: slide === 0 ? 'block' : 'none', cursor: zoom[0] > 1 ? 'grab' : 'default' }}>
                  <img
                  src={allocUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}
                  alt="Optimization Allocation Chart"
                  className={`po-slide ${slide === 0 ? 'active' : ''}`}
                  style={{ transform: `translate(${offset[0].x}px, ${offset[0].y}px) scale(${zoom[0]})`, transformOrigin: 'center center' }}
                />
                </div>
                <div className="po-zoom-wrap" onMouseDown={(e) => onMouseDown(e, 1)} style={{ width: '100%', height: '100%', overflow: 'hidden', display: slide === 1 ? 'block' : 'none', cursor: zoom[1] > 1 ? 'grab' : 'default' }}>
                  <img
                  src={summaryUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}
                  alt="Optimization Summary Chart"
                  className={`po-slide ${slide === 1 ? 'active' : ''}`}
                  style={{ transform: `translate(${offset[1].x}px, ${offset[1].y}px) scale(${zoom[1]})`, transformOrigin: 'center center' }}
                />
                </div>
              </div>
              <button className="slider-nav right" onClick={nextSlide} aria-label="Next">›</button>
              {/* Zoom controls */}
              <div className="po-zoom-controls">
                <button type="button" onClick={() => updateZoom(slide, -0.25)} title="Zoom Out" aria-label="Zoom Out">−</button>
                <span className="po-zoom-level">{Math.round(zoom[slide] * 100)}%</span>
                <button type="button" onClick={() => updateZoom(slide, 0.25)} title="Zoom In" aria-label="Zoom In">+</button>
                <button type="button" onClick={() => resetZoom(slide)} title="Reset" aria-label="Reset">Reset</button>
              </div>
            </div>
            <div className="dots">
              <button className={`dot ${slide === 0 ? 'active' : ''}`} onClick={() => setSlide(0)} aria-label="Slide 1" />
              <button className={`dot ${slide === 1 ? 'active' : ''}`} onClick={() => setSlide(1)} aria-label="Slide 2" />
            </div>
          </div>
        )}

        <FormModal
          open={showMinTasksModal}
          title="Not enough tasks"
          onCancel={() => setShowMinTasksModal(false)}
          footer={(
            <button type="button" className="primary-btn" onClick={() => setShowMinTasksModal(false)}>OK</button>
          )}
        >
          <div style={{ fontSize: 14, color: '#334155' }}>
            At least 2 tasks are required in a process to run optimization. Please add more tasks and try again.
          </div>
        </FormModal>
      </div>
    </div>
  );
};

export default ProcessOptimizationPage;
