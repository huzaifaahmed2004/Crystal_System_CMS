import React, { useMemo, useState } from 'react';
import '../../styles/modal.css';

// Props: open, onClose, onSave({name, level}) , levels
const SkillAddModal = ({ open, onClose, onSave, levels = [] }) => {
  const [name, setName] = useState('');
  const [levelName, setLevelName] = useState('');
  const levelByRank = useMemo(() => {
    const m = {};
    levels.forEach(l => { m[l.rank] = l.name; });
    return m;
  }, [levels]);

  const handleSave = () => {
    const n = String(name || '').trim();
    const ln = String(levelName || '').trim();
    if (!n || !ln) return;
    onSave && onSave({ name: n, level: ln });
    setName('');
    setLevelName('');
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <div className="modal-title">Add Skill</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Skill Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Machine Operation" />
            </div>
            <div className="form-group">
              <label>Level Name</label>
              <select value={levelName} onChange={e => setLevelName(e.target.value)}>
                <option value="">Select Level</option>
                {levels.map(l => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Level Rank</label>
              <select
                value={(levels.find(l => l.name === levelName)?.rank) || ''}
                onChange={e => {
                  const picked = levels.find(l => l.rank === Number(e.target.value));
                  setLevelName(picked ? picked.name : '');
                }}
              >
                <option value="">-</option>
                {levels.map(l => (
                  <option key={l.rank} value={l.rank}>{l.rank}</option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Level Description</label>
              <input disabled value={(levels.find(l => l.name === levelName)?.description) || ''} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" onClick={handleSave} disabled={!name || !levelName}>Add</button>
        </div>
      </div>
    </div>
  );
};

export default SkillAddModal;
