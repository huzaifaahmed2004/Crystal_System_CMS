import React from 'react';

const Sidebar = ({ activeSection, setActiveSection }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'D' },
    { id: 'process-management', label: 'Process Management', icon: 'P' },
    { id: 'task-management', label: 'Task Management', icon: 'T' },
    { id: 'job-management', label: 'Job Management', icon: 'J' },
    { id: 'function-management', label: 'Function Management', icon: 'F' },
    { id: 'ai-processes', label: 'AI-Generated Processes (Review & Approval)', icon: 'A' },
    { id: 'user-access', label: 'User & Access Control', icon: 'U' },
    { id: 'layout-management', label: 'Layout Management', icon: 'L' }
  ];

  return (
    <aside className="dashboard-sidebar">
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-button ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
