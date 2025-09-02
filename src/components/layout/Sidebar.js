import React, { useState, useEffect } from 'react';

const Sidebar = ({ collapsed, activeSection, setActiveSection }) => {
  const [openUserAccess, setOpenUserAccess] = useState(false);
  const [openCompany, setOpenCompany] = useState(false);
  const [openActivities, setOpenActivities] = useState(false);
  const [openOrganization, setOpenOrganization] = useState(false);

  // Keep submenu open when a related section is active
  useEffect(() => {
    if (['user-access', 'role-management'].includes(activeSection)) {
      setOpenUserAccess(true);
    }
    if (['company-overview', 'companies', 'buildings', 'building-detail', 'building-floors', 'rooms', 'company-management', 'organization-management'].includes(activeSection)) {
      setOpenCompany(true);
    }
    if (['process-management', 'task-management'].includes(activeSection)) {
      setOpenActivities(true);
    }
    if (['job-management', 'function-management', 'people-management'].includes(activeSection)) {
      setOpenOrganization(true);
    }
  }, [activeSection]);
  const icons = {
    'dashboard': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
      </svg>
    ),
    'activities': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="6" r="2" fill="currentColor" />
        <circle cx="18" cy="12" r="2" fill="currentColor" />
        <path d="M8 12h8M12 8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'process-management': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 3h12v4H6V3zm0 7h12v4H6v-4zm0 7h12v4H6v-4z" fill="currentColor"/>
      </svg>
    ),
    'task-management': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 11l3 3L22 4l-2-2-8 8-3-3-2 2 5 5zM2 20h20v2H2v-2z" fill="currentColor"/>
      </svg>
    ),
    'organization': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M10 3h4v4h-4V3zm-6 6h4v4H4V9zm12 0h4v4h-4V9zM10 15h4v6h-4v-6zm-6 2h4v4H4v-4zm12 0h4v4h-4v-4z" fill="currentColor"/>
      </svg>
    ),
    'job-management': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 6V4H10v2H4v4h16V6h-6zM4 12v8h16v-8H4z" fill="currentColor"/>
      </svg>
    ),
    'function-management': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7l3-7z" fill="currentColor"/>
      </svg>
    ),
    // Parent icon for Structure section (match other SVG icons)
    'company': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20h16v-2H4v2zm2-4h12v-2H6v2zm-2-4h16V6H4v6zm2-4h12v2H6V8z" fill="currentColor"/>
      </svg>
    ),
    'ai-processes': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2a5 5 0 015 5v1h1a4 4 0 110 8h-1v1a5 5 0 11-10 0v-1H6a4 4 0 110-8h1V7a5 5 0 015-5z" fill="currentColor"/>
      </svg>
    ),
    'user-access': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z" fill="currentColor"/>
      </svg>
    )
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'organization', label: 'Organization' },
    { id: 'activities', label: 'Activities' },
  
    { id: 'company', label: 'Structure' },
    { id: 'ai-processes', label: 'AI-Generated Processes' },
    { id: 'user-access', label: 'User & Access Control' },
    // layout-management removed
  ];

  return (
    <aside className={`dashboard-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              {item.id === 'user-access' ? (
                <>
                  <button
                    className={`nav-button ${(['user-access', 'role-management'].includes(activeSection)) ? 'active' : ''}`}
                    onClick={() => setOpenUserAccess((v) => !v)}
                    title={collapsed ? item.label : ''}
                  >
                    <span className="nav-icon" aria-hidden="true">{icons[item.id]}</span>
                    {!collapsed && (
                      <span className="nav-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        {item.label}
                        <span className={`submenu-caret ${openUserAccess ? 'open' : ''}`} aria-hidden="true">▾</span>
                      </span>
                    )}
                  </button>
                  {!collapsed && openUserAccess && (
                    <ul className="nav-sublist" style={{ marginTop: 4, marginLeft: 36 }}>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'user-access' ? 'active' : ''}`}
                          onClick={() => setActiveSection('user-access')}
                        >
                          User
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'role-management' ? 'active' : ''}`}
                          onClick={() => setActiveSection('role-management')}
                        >
                          Roles
                        </button>
                      </li>
                    </ul>
                  )}
                </>
              ) : item.id === 'company' ? (
                <>
                  <button
                    className={`nav-button ${(['company-overview', 'companies', 'buildings', 'building-detail', 'building-floors', 'rooms', 'company-management', 'organization-management'].includes(activeSection)) ? 'active' : ''}`}
                    onClick={() => setOpenCompany((v) => !v)}
                    title={collapsed ? item.label : ''}
                  >
                    <span className="nav-icon" aria-hidden="true">{icons[item.id]}</span>
                    {!collapsed && (
                      <span className="nav-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        {item.label}
                        <span className={`submenu-caret ${openCompany ? 'open' : ''}`} aria-hidden="true">▾</span>
                      </span>
                    )}
                  </button>
                  {!collapsed && openCompany && (
                    <ul className="nav-sublist" style={{ marginTop: 4, marginLeft: 36 }}>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'company-overview' ? 'active' : ''}`}
                          onClick={() => setActiveSection('company-overview')}
                        >
                          Overview
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'companies' ? 'active' : ''}`}
                          onClick={() => setActiveSection('companies')}
                        >
                          Companies
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${(['buildings','building-detail'].includes(activeSection)) ? 'active' : ''}`}
                          onClick={() => setActiveSection('buildings')}
                        >
                          Buildings
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'building-floors' ? 'active' : ''}`}
                          onClick={() => setActiveSection('building-floors')}
                        >
                          Floors
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'rooms' ? 'active' : ''}`}
                          onClick={() => setActiveSection('rooms')}
                        >
                          Rooms
                        </button>
                      </li>
                    </ul>
                  )}
                </>
              ) : item.id === 'activities' ? (
                <>
                  <button
                    className={`nav-button ${(['process-management', 'task-management'].includes(activeSection)) ? 'active' : ''}`}
                    onClick={() => setOpenActivities((v) => !v)}
                    title={collapsed ? item.label : ''}
                  >
                    <span className="nav-icon" aria-hidden="true">{icons[item.id]}</span>
                    {!collapsed && (
                      <span className="nav-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        {item.label}
                        <span className={`submenu-caret ${openActivities ? 'open' : ''}`} aria-hidden="true">▾</span>
                      </span>
                    )}
                  </button>
                  {!collapsed && openActivities && (
                    <ul className="nav-sublist" style={{ marginTop: 4, marginLeft: 36 }}>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'process-management' ? 'active' : ''}`}
                          onClick={() => setActiveSection('process-management')}
                        >
                          Processes
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'task-management' ? 'active' : ''}`}
                          onClick={() => setActiveSection('task-management')}
                        >
                          Tasks
                        </button>
                      </li>
                    </ul>
                  )}
                </>
              ) : item.id === 'organization' ? (
                <>
                  <button
                    className={`nav-button ${(['job-management', 'function-management'].includes(activeSection)) ? 'active' : ''}`}
                    onClick={() => setOpenOrganization((v) => !v)}
                    title={collapsed ? item.label : ''}
                  >
                    <span className="nav-icon" aria-hidden="true">{icons[item.id]}</span>
                    {!collapsed && (
                      <span className="nav-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        {item.label}
                        <span className={`submenu-caret ${openOrganization ? 'open' : ''}`} aria-hidden="true">▾</span>
                      </span>
                    )}
                  </button>
                  {!collapsed && openOrganization && (
                    <ul className="nav-sublist" style={{ marginTop: 4, marginLeft: 36 }}>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'job-management' ? 'active' : ''}`}
                          onClick={() => setActiveSection('job-management')}
                        >
                          Jobs
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'function-management' ? 'active' : ''}`}
                          onClick={() => setActiveSection('function-management')}
                        >
                          Functions
                        </button>
                      </li>
                      <li className="nav-subitem">
                        <button
                          className={`nav-subbutton ${activeSection === 'people-management' ? 'active' : ''}`}
                          onClick={() => setActiveSection('people-management')}
                        >
                          People
                        </button>
                      </li>
                    </ul>
                  )}
                </>
              ) : (
                <button
                  className={`nav-button ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                  title={collapsed ? item.label : ''}
                >
                  <span className="nav-icon" aria-hidden="true">{icons[item.id]}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
