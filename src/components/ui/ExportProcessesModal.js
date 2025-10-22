import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/modal.css';
import '../../styles/export-modal.css';
import { getProcessesWithRelations } from '../../services/processService';
import { exportProcesses } from '../../services/exportService';

const ExportProcessesModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Load processes when modal opens
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getProcessesWithRelations();
        if (!mounted) return;
        setProcesses(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setError('Failed to load processes');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter(p =>
      String(p.process_name || p.name || '').toLowerCase().includes(q) ||
      String(p.process_code || p.code || '').toLowerCase().includes(q)
    );
  }, [processes, query]);

  const allVisibleSelected = useMemo(() => (
    filtered.length > 0 && filtered.every(p => selected.has(p.process_id || p.id))
  ), [filtered, selected]);

  const toggleOne = (pid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      const ids = filtered.map(p => p.process_id || p.id);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleExport = async () => {
    setExportError(null);
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setExportError('Please select at least one process to export.');
      return;
    }
    setExporting(true);
    try {
      const link = await exportProcesses(ids);
      const a = document.createElement('a');
      a.href = link;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setExportError(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Export Processes</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="export-error">{error}</div>}
          {exportError && <div className="export-error">{exportError}</div>}

          <div className="export-toolbar">
            <input
              className="export-search"
              placeholder="Search by name or code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="export-selectall" onClick={toggleAllVisible} disabled={loading || filtered.length === 0}>
              {allVisibleSelected ? 'Unselect visible' : 'Select visible'}
            </button>
          </div>

          <div className="export-list">
            {loading ? (
              <div className="export-empty">Loading processes…</div>
            ) : filtered.length === 0 ? (
              <div className="export-empty">No processes found</div>
            ) : (
              <ul>
                {filtered.map((p) => {
                  const pid = p.process_id || p.id;
                  const checked = selected.has(pid);
                  return (
                    <li key={pid} className={checked ? 'selected' : ''}>
                      <label>
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(pid)} />
                        <span className="item-title">{p.process_name || p.name || 'Untitled Process'}</span>
                        <span className="item-meta">{p.process_code || p.code || ''}</span>
                        <span className="item-badge">{Array.isArray(p.process_tasks) ? p.process_tasks.length : (Array.isArray(p.process_task) ? p.process_task.length : 0)} tasks</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose} disabled={loading || exporting}>Cancel</button>
          <button className="primary-btn" onClick={handleExport} disabled={loading || exporting || selected.size === 0}>
            {exporting ? 'Exporting…' : 'Export in Excel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportProcessesModal;
