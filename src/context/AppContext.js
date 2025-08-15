import React, { createContext, useContext } from 'react';

export const AppContext = createContext({
  setActiveSection: () => {},
  layoutCompanyId: null,
  setLayoutCompanyId: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ value, children }) => (
  <AppContext.Provider value={value}>{children}</AppContext.Provider>
);
