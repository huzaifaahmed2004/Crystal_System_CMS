import React, { useState, useEffect } from 'react';
import MainLayout from './layout/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import ProcessManagementPage from '../pages/ProcessManagementPage';
import TaskManagementPage from '../pages/TaskManagementPage';
import JobManagementPage from '../pages/JobManagementPage';
import FunctionManagementPage from '../pages/FunctionManagementPage';
import AIProcessesPage from '../pages/AIProcessesPage';
import UserAccessControlPage from '../pages/UserAccessControlPage';
import LayoutManagementPage from '../pages/LayoutManagementPage';
import OrganizationManagementPage from '../pages/OrganizationManagementPage';
import RoleManagementPage from '../pages/RoleManagementPage';
import { AppProvider } from '../context/AppContext';

const Dashboard = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState(() => sessionStorage.getItem('activeSection') || 'dashboard');
  const [layoutCompanyId, setLayoutCompanyId] = useState(null);

  // Persist active section across refreshes in this session
  useEffect(() => {
    try {
      sessionStorage.setItem('activeSection', activeSection);
    } catch (_) {
      // ignore storage errors
    }
  }, [activeSection]);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage />;
      case 'process-management':
        return <ProcessManagementPage />;
      case 'task-management':
        return <TaskManagementPage />;
      case 'job-management':
        return <JobManagementPage />;
      case 'function-management':
        return <FunctionManagementPage />;
      case 'organization-management':
        return <OrganizationManagementPage />;
      case 'ai-processes':
        return <AIProcessesPage />;
      case 'role-management':
        return <RoleManagementPage />;
      case 'user-access':
        return <UserAccessControlPage />;
      case 'layout-management':
        return <LayoutManagementPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <MainLayout 
      user={user} 
      onLogout={onLogout}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    >
      <AppProvider value={{ setActiveSection, layoutCompanyId, setLayoutCompanyId }}>
        <div className="page-router">
          {renderContent()}
        </div>
      </AppProvider>
    </MainLayout>
  );
};

export default Dashboard;
