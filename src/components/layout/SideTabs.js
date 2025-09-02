import React, { useState } from 'react';
import '../../styles/side-tabs.css';

// Simple vertical side tabs layout
// props: tabs = [{ id, label, content }], defaultActiveId
const SideTabs = ({ tabs = [], defaultActiveId }) => {
  const initial = defaultActiveId || (tabs[0]?.id ?? null);
  const [active, setActive] = useState(initial);

  return (
    <div className="side-tabs">
      <div className="side-tabs-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`side-tab-btn ${active === t.id ? 'active' : ''}`}
            onClick={() => setActive(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="side-tabs-content">
        {tabs.map(t => (
          <div key={t.id} className="side-tab-panel" style={{ display: active === t.id ? 'block' : 'none' }}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SideTabs;
