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
    name: 'Admin',
    role: 'ADMIN',
    email: 'admin@fiorify.corp'
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

  const resetDemoData = async () => {
    try {
      await fetch('/api/v1/system/reset-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch((err) => {
        console.warn('Backend reset call warning:', err);
      });
    } catch {
      // Non-blocking
    }

    localStore.resetAll();
    try {
      localStorage.removeItem('Fiorify_notifications_store_v1');
      localStorage.removeItem('fiorify_notifications_store_v1');
      localStorage.removeItem('Fiorify_auth_session_v1');
      localStorage.removeItem('fiorify_auth_session_v1');
      sessionStorage.clear();
    } catch {}

    window.location.href = '/overview';
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
