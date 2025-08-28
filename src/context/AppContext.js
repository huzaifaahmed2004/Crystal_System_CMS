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
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ value, children }) => (
  <AppContext.Provider value={value}>{children}</AppContext.Provider>
);
