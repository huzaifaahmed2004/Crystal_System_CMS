import React, { useState } from 'react';
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

const Dashboard = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');

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
      <div className="page-router">
        {renderContent()}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
