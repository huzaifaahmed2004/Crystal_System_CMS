import React from 'react';

const UserAccessControlPage = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">User & Access Control</h2>
        <p className="page-subtitle">Manage users, roles, and permissions across the system</p>
      </div>
      
      <div className="page-content">
        <div className="coming-soon-card">
          <div className="coming-soon-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M16 11a4 4 0 10-8 0 4 4 0 008 0z" fill="currentColor"/>
              <path d="M4 20a6 6 0 1112 0v1H4v-1zM18 10a3 3 0 110-6 3 3 0 010 6z" fill="currentColor" opacity="0.7"/>
              <path d="M14.5 20c.3-2.9 2.8-5 5.5-5 1.2 0 2.3.3 3.2.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
            </svg>
          </div>
          <h3>User & Access Control</h3>
          <p>This section will allow you to:</p>
          <ul>
            <li>Manage user accounts and profiles</li>
            <li>Define roles and permissions</li>
            <li>Control access to system features</li>
            <li>Monitor user activity and sessions</li>
          </ul>
          <div className="coming-soon-badge">Coming Soon</div>
        </div>
      </div>
    </div>
  );
};

export default UserAccessControlPage;
