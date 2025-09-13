import React from 'react';
import '../styles/process-optimization.css';
import { getProcessesWithRelations } from '../services/processService';

const ProcessOptimizationPage = () => {
  const [loading, setLoading] = React.useState(false);
  const [processes, setProcesses] = React.useState([]);
  const [labelToId, setLabelToId] = React.useState(new Map());
  const inputRef = React.useRef(null);
  const [selectedId, setSelectedId] = React.useState(null);
  const [showResults, setShowResults] = React.useState(false);
  const [slide, setSlide] = React.useState(0);

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

  const optimize = async () => {
    const pid = getSelectedId();
    if (!pid) return;
    setLoading(true);
    // No backend yet; simulate delay then show results
    setTimeout(() => {
      setShowResults(true);
      setSlide(0);
      setLoading(false);
    }, 500);
  };

  const nextSlide = () => setSlide(s => (s + 1) % 2);
  const prevSlide = () => setSlide(s => (s + 1) % 2); // 2 slides only, same behaviour

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
              <input id="po-process" ref={inputRef} list="po-process-options" placeholder="Search and select a process..." className="input" onInput={onInput} autoComplete="off" />
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
            <div className="slider">
              <button className="slider-nav left" onClick={prevSlide} aria-label="Previous">‹</button>
              <div className="slides">
                <img
                  src="https://placehold.co/1200x450?text=Optimization+Chart+1"
                  alt="Optimization Chart 1"
                  className={`slide ${slide === 0 ? 'active' : ''}`}
                />
                <img
                  src="https://placehold.co/1200x450?text=Optimization+Chart+2"
                  alt="Optimization Chart 2"
                  className={`slide ${slide === 1 ? 'active' : ''}`}
                />
              </div>
              <button className="slider-nav right" onClick={nextSlide} aria-label="Next">›</button>
            </div>
            <div className="dots">
              <button className={`dot ${slide === 0 ? 'active' : ''}`} onClick={() => setSlide(0)} aria-label="Slide 1" />
              <button className={`dot ${slide === 1 ? 'active' : ''}`} onClick={() => setSlide(1)} aria-label="Slide 2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessOptimizationPage;
