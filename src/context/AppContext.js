import React, { createContext, useContext } from 'react';

export const AppContext = createContext({
  // routing
  activeSection: 'dashboard',
  setActiveSection: () => {},
  // layout mgmt
  layoutCompanyId: null,
  setLayoutCompanyId: () => {},
  // building mgmt navigation
  buildingId: null,
  setBuildingId: () => {},
  buildingFormMode: 'view', // 'create' | 'edit' | 'view' | 'delete'
  setBuildingFormMode: () => {},
  // floor mgmt navigation
  floorId: null,
  setFloorId: () => {},
  floorFormMode: 'view', // 'create' | 'edit' | 'view'
  setFloorFormMode: () => {},
  // function mgmt navigation
  functionId: null,
  setFunctionId: () => {},
  functionFormMode: 'view', // 'create' | 'edit' | 'view'
  setFunctionFormMode: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ value, children }) => (
  <AppContext.Provider value={value}>{children}</AppContext.Provider>
);
