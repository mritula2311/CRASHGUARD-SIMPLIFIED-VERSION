"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
import type { CrashData } from '@/lib/types';
import { getSensorData } from '@/services/lora-receiver';

const initialCrashData: CrashData = {
  location: "123 Collision Course, Metro City, 12345",
  severity: "High",
  speed: 120,
};

interface CrashContextType {
  crashData: CrashData;
  setCrashData: React.Dispatch<React.SetStateAction<CrashData>>;
  simulateNewCrash: () => Promise<void>;
}

const CrashContext = createContext<CrashContextType | undefined>(undefined);

export function CrashProvider({ children }: { children: ReactNode }) {
  const [crashData, setCrashData] = useState<CrashData>(initialCrashData);

  const simulateNewCrash = async () => {
    // In a real app, this would fetch from a live source.
    // Here we use our mock LoRa service.
    const newData = await getSensorData();
    setCrashData(newData);
  };

  return (
    <CrashContext.Provider value={{ crashData, setCrashData, simulateNewCrash }}>
      {children}
    </CrashContext.Provider>
  );
}

export function useCrash() {
  const context = useContext(CrashContext);
  if (context === undefined) {
    throw new Error('useCrash must be used within a CrashProvider');
  }
  return context;
}
