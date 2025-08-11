import React from 'react';

const Header = ({ user, onLogout, onToggleSidebar }) => {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <h1 className="header-title">CMS Dashboard</h1>
      </div>
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">Welcome, {user?.name || 'Admin'}</span>
          <button className="logout-btn" onClick={onLogout} aria-label="Log out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginRight: 8 }}>
              <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
