import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/side-tabs.css';

// Simple vertical side tabs layout
// props: 
// - tabs = [{ id, label, content }]
// - defaultActiveId
// - disabledIds = []
// - activeId (controlled)
// - onChange(id)
const SideTabs = ({ tabs = [], defaultActiveId, disabledIds = [], activeId, onChange }) => {
  const firstEnabledId = useMemo(() => {
    const disabled = new Set(disabledIds || []);
    const fromDefault = defaultActiveId && !disabled.has(defaultActiveId) ? defaultActiveId : null;
    if (fromDefault) return fromDefault;
    for (const t of tabs) {
      if (!disabled.has(t.id)) return t.id;
    }
    return tabs[0]?.id ?? null; // fallback
  }, [tabs, defaultActiveId, disabledIds]);

  const [internalActive, setInternalActive] = useState(firstEnabledId);

  useEffect(() => {
    // if current active becomes disabled, switch to first enabled
    const disabled = new Set(disabledIds || []);
    const current = activeId !== undefined ? activeId : internalActive;
    if (current && disabled.has(current)) {
      setInternalActive(firstEnabledId);
      onChange && onChange(firstEnabledId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledIds, firstEnabledId]);

  const currentActive = activeId !== undefined ? activeId : internalActive;

  return (
    <div className="side-tabs">
      <div className="side-tabs-nav">
        {tabs.map(t => {
          const disabled = (disabledIds || []).includes(t.id);
          const isActive = currentActive === t.id;
          return (
            <button
              key={t.id}
              className={`side-tab-btn ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => {
                if (disabled) return;
                if (activeId === undefined) setInternalActive(t.id);
                onChange && onChange(t.id);
              }}
              type="button"
              aria-disabled={disabled}
              title={disabled ? 'Locked' : undefined}
            >
              {t.label} {disabled ? '🔒' : ''}
            </button>
          );
        })}
      </div>
      <div className="side-tabs-content">
        {tabs.map(t => (
          <div key={t.id} className="side-tab-panel" style={{ display: currentActive === t.id ? 'block' : 'none' }}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SideTabs;
