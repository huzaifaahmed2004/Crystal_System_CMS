import React from 'react';

const Header = ({ user, onLogout }) => {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title">CMS Dashboard</h1>
      </div>
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">Welcome, {user?.name || 'Admin'}</span>
          <button className="logout-btn" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
