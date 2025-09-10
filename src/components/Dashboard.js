import React, { useState, useEffect } from 'react';
import MainLayout from './layout/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import ProcessManagementPage from '../pages/ProcessManagementPage';
import ProcessViewPage from '../pages/ProcessViewPage';
import ProcessCreatePage from '../pages/ProcessCreatePage';
import ProcessEditPage from '../pages/ProcessEditPage';
import TaskListTablePage from '../pages/TaskListTablePage';
import TaskCreatePage from '../pages/TaskCreatePage';
import JobManagementPage from '../pages/JobManagementPage';
import JobDetailPage from '../pages/JobDetailPage';
import JobCreatePage from '../pages/JobCreatePage';
import JobEditPage from '../pages/JobEditPage';
import TaskDetailPage from '../pages/TaskDetailPage';
import TaskEditPage from '../pages/TaskEditPage';
import FunctionManagementPage from '../pages/FunctionManagementPage';
import FunctionDetailPage from '../pages/FunctionDetailPage';
import FunctionEditPage from '../pages/FunctionEditPage';
import FunctionCreatePage from '../pages/FunctionCreatePage';
import RoomManagementPage from '../pages/RoomManagementPage';
import AIProcessesPage from '../pages/AIProcessesPage';
import UserAccessControlPage from '../pages/UserAccessControlPage';
import CompanyManagementPage from '../pages/CompanyManagementPage';
import CompanyOverviewPage from '../pages/CompanyOverviewPage';
import RoleManagementPage from '../pages/RoleManagementPage';
import BuildingManagementPage from '../pages/BuildingManagementPage';
import BuildingDetailPage from '../pages/BuildingDetailPage';
import BuildingEditPage from '../pages/BuildingEditPage';
import FloorManagementPage from '../pages/FloorManagementPage';
import FloorDetailPage from '../pages/FloorDetailPage';
import PeopleManagementPage from '../pages/PeopleManagementPage';
import PeopleCreatePage from '../pages/PeopleCreatePage';
import PeopleEditPage from '../pages/PeopleEditPage';
import PeopleViewPage from '../pages/PeopleViewPage';
import WhatIfAnalysisPage from '../pages/WhatIfAnalysisPage';
import { AppProvider } from '../context/AppContext';

const Dashboard = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState(() => {
    // Prefer URL hash for deep link/back-forward support, fallback to sessionStorage, then default
    const hash = (typeof window !== 'undefined' && window.location && window.location.hash)
      ? window.location.hash.replace(/^#\/?/, '')
      : '';
    if (hash) return hash;
    return sessionStorage.getItem('activeSection') || 'dashboard';
  });
  const [layoutCompanyId, setLayoutCompanyId] = useState(null);
  const [buildingId, setBuildingId] = useState(null);
  const [buildingFormMode, setBuildingFormMode] = useState('view');
  const [floorId, setFloorId] = useState(null);
  const [floorFormMode, setFloorFormMode] = useState('view');
  const [functionId, setFunctionId] = useState(null);
  const [functionFormMode, setFunctionFormMode] = useState('view');
  const [jobId, setJobId] = useState(null);
  const [jobFormMode, setJobFormMode] = useState('view');

  // Persist active section across refreshes in this session
  useEffect(() => {
    try {
      sessionStorage.setItem('activeSection', activeSection);
    } catch (_) {
      // ignore storage errors
    }
    // Keep URL hash in sync so link changes reflect active page
    if (typeof window !== 'undefined') {
      const nextHash = `#/${activeSection}`;
      if (window.location.hash !== nextHash) {
        // Use replaceState for initial load-like changes to avoid cluttering history when toggling within app
        window.history.replaceState(null, '', nextHash);
      }
    }
  }, [activeSection]);

  // Handle back/forward navigation via hashchange
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
      setActiveSection(prev => (prev !== hash ? hash : prev));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage />;
      case 'process-management':
        return <ProcessManagementPage />;
      case 'process-view':
        return <ProcessViewPage />;
      case 'process-create':
        return <ProcessCreatePage />;
      case 'process-edit':
        return <ProcessEditPage />;
      case 'task-management':
        return <TaskListTablePage />;
      case 'task-create':
        return <TaskCreatePage />;
      case 'task-detail':
        return <TaskDetailPage />;
      case 'task-edit':
        return <TaskEditPage />;
      case 'job-management':
        return <JobManagementPage />;
      case 'job-detail':
        return <JobDetailPage />;
      case 'job-create':
        return <JobCreatePage />;
      case 'job-edit':
        return <JobEditPage />;
      case 'function-management':
        return <FunctionManagementPage />;
      case 'function-detail':
        return <FunctionDetailPage />;
      case 'function-edit':
        return <FunctionEditPage />;
      case 'function-create':
        return <FunctionCreatePage />;
      case 'company-overview':
        return <CompanyOverviewPage />;
      case 'companies':
        return <CompanyManagementPage />;
      case 'buildings':
        return <BuildingManagementPage />;
      case 'building-detail':
        return <BuildingDetailPage />;
      case 'building-edit':
        return <BuildingEditPage />;
      case 'building-floors':
        return <FloorManagementPage />;
      case 'floor-detail':
        return <FloorDetailPage />;
      case 'rooms':
        return <RoomManagementPage />;
      case 'people-management':
        return <PeopleManagementPage />;
      case 'people-create':
        return <PeopleCreatePage />;
      case 'people-edit':
        return <PeopleEditPage />;
      case 'people-view':
        return <PeopleViewPage />;
      case 'what-if-analysis':
        return <WhatIfAnalysisPage />;
      // Backward compatibility for persisted sessions/older ids
      case 'company-management':
      case 'organization-management':
        return <CompanyManagementPage />;
      case 'ai-processes':
        return <AIProcessesPage />;
      case 'role-management':
        return <RoleManagementPage />;
      case 'user-access':
        return <UserAccessControlPage />;
      // layout-management removed; layout UI is integrated into FloorDetailPage
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
      <AppProvider value={{
        setActiveSection,
        layoutCompanyId, setLayoutCompanyId,
        buildingId, setBuildingId,
        buildingFormMode, setBuildingFormMode,
        floorId, setFloorId,
        floorFormMode, setFloorFormMode,
        functionId, setFunctionId,
        functionFormMode, setFunctionFormMode,
        jobId, setJobId,
        jobFormMode, setJobFormMode,
      }}>
        <div className="page-router">
          {renderContent()}
        </div>
      </AppProvider>
    </MainLayout>
  );
};

export default Dashboard;
