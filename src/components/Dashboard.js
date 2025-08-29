import React, { useState, useEffect } from 'react';
import MainLayout from './layout/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import ProcessManagementPage from '../pages/ProcessManagementPage';
import TaskManagementPage from '../pages/TaskManagementPage';
import JobManagementPage from '../pages/JobManagementPage';
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
import { AppProvider } from '../context/AppContext';

const Dashboard = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState(() => sessionStorage.getItem('activeSection') || 'dashboard');
  const [layoutCompanyId, setLayoutCompanyId] = useState(null);
  const [buildingId, setBuildingId] = useState(null);
  const [buildingFormMode, setBuildingFormMode] = useState('view');
  const [floorId, setFloorId] = useState(null);
  const [floorFormMode, setFloorFormMode] = useState('view');
  const [functionId, setFunctionId] = useState(null);
  const [functionFormMode, setFunctionFormMode] = useState('view');

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
      }}>
        <div className="page-router">
          {renderContent()}
        </div>
      </AppProvider>
    </MainLayout>
  );
};

export default Dashboard;
