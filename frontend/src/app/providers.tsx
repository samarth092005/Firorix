import React, { createContext, useContext, useState, useEffect } from 'react';
import { SapSystem } from '../types';
import { systemService } from '../services/mock/systemService';
import { localStore } from '../services/mock/localStore';

interface AppContextType {
  systems: SapSystem[];
  activeSystem: SapSystem | null;
  setActiveSystem: (sys: SapSystem) => void;
  refreshSystems: () => Promise<void>;
  resetDemoData: () => void;
  currentUser: {
    name: string;
    role: string;
    email: string;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systems, setSystems] = useState<SapSystem[]>([]);
  const [activeSystem, setActiveSystem] = useState<SapSystem | null>(null);

  const currentUser = {
    name: 'Enterprise System Administrator',
    role: 'ADMIN',
    email: 'admin@fiorix.corp'
  };

  const loadSystems = async () => {
    const res = await systemService.getAllSystems();
    setSystems(res.data);
    if (!activeSystem && res.data.length > 0) {
      setActiveSystem(res.data[0]);
    }
  };

  useEffect(() => {
    loadSystems();
  }, []);

  const resetDemoData = () => {
    localStore.resetAll();
    window.location.reload();
  };

  return (
    <AppContext.Provider
      value={{
        systems,
        activeSystem,
        setActiveSystem,
        refreshSystems: loadSystems,
        resetDemoData,
        currentUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
