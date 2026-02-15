import React, { createContext, useContext } from 'react';
import { AppServices } from '../services/appServices';

const ServicesContext = createContext<AppServices | null>(null);

export const ServicesProvider: React.FC<{ services: AppServices; children: React.ReactNode }> = ({ services, children }) => {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
};

export const useServices = () => {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used within ServicesProvider');
  return ctx;
};

