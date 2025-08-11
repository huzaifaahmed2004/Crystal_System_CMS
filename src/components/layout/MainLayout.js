import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const MainLayout = ({ user, onLogout, children, activeSection, setActiveSection }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="dashboard-layout">
      <Header 
        user={user} 
        onLogout={onLogout}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="dashboard-main">
        <Sidebar 
          collapsed={sidebarCollapsed}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
