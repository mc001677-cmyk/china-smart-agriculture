import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { generateAllHistory, calculateYieldStats, DailyLog, DailyTrajectory, AlertRecord, allLogs, allTrajectories, allAlerts } from "@/lib/historyGenerator";
import { format, subDays } from "date-fns";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// Types
export interface MachineData {
  id: number;
  name: string;
  serial: string;
  type: "tractor" | "harvester";
  status: "working" | "idle" | "moving" | "off" | "offline" | "power_on";
  statusText: string;
  brand: string;
  model?: string;
  fuel: number; // %
  def: number; // %
  load: number; // %
  lat: number;
  lng: number;
  heading: number; // 0-360
  warning?: boolean;
  
  // Harvest Data (Harvester only)
  yield?: number; // kg/mu (Current instantaneous yield)
  moisture?: number; // % (Grain moisture content)
  grainTank?: number; // % (Grain tank fill level)
  totalYield?: number; // kg (Total harvested mass)
  areaWorked?: number; // mu (Total area worked)
  
  // Detailed Parameters
  params: {
    rpm: number;
    speed: number; // km/h
    fuelRate: number; // L/h
    intakeHumidity: number; // %
    pressure: number; // kPa
    airTemp: number; // °C
    fuelTemp: number; // °C
    defLevel: number; // %
    defTemp: number; // °C
    defRate: number; // L/h
    defPressure: number; // kPa
    scrInTemp: number; // °C
    scrOutTemp: number; // °C
    dpfSoot: number; // g
    dpfDiffPressure: number; // kPa
    docInTemp: number; // °C
    docOutTemp: number; // °C
    ptoSpeed: number; // rpm
    hitchPos: number; // %
    hitchForce: number; // kN
    
    // Health Metrics (New)
    engineOilHealth: number; // %
    hydraulicOilHealth: number; // %
    filterHealth: number; // %
  }
}

export interface GlobalStats {
  totalArea: number; // mu
  dailyProgress: number; // %
  activeCount: number;
  movingCount: number;
  offlineCount: number;
}

interface FleetContextType {
  fleet: MachineData[];
  getMachineById: (id: number) => MachineData | undefined;
  activeMachineId: number | null;
  setActiveMachineId: (id: number | null) => void;
  isLoading: boolean;
  globalStats: GlobalStats;
  fuelHistory: Record<number, number[]>; // Map machine ID to fuel rate history
  
  // History Features
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  dailyLogs: Record<number, DailyLog[]>; // MachineID -> Logs
  dailyTrajectories: Record<number, DailyTrajectory[]>; // MachineID -> Trajectories
  getDailyLog: (machineId: number, date: string) => DailyLog | undefined;
  getDailyTrajectory: (machineId: number, date: string) => DailyTrajectory | undefined;
  
  // New: All data accessors
  allLogs: DailyLog[];
  allTrajectories: DailyTrajectory[];
  alerts: AlertRecord[];
  yieldStats: ReturnType<typeof calculateYieldStats> | null;
  
  // Alert management
  resolveAlert: (alertId: string) => void;
  unresolvedAlertCount: number;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

import { initialFleet, fluctuate } from "@/lib/mockData";

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");

  const [fleet, setFleet] = useState<MachineData[]>(() => (isSimulateMode ? initialFleet : []));
  const [activeMachineId, setActiveMachineId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fuelHistory, setFuelHistory] = useState<Record<number, number[]>>({});
  
  // History State
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dailyLogs, setDailyLogs] = useState<Record<number, DailyLog[]>>({});
  const [dailyTrajectories, setDailyTrajectories] = useState<Record<number, DailyTrajectory[]>>({});
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [allTrajectories, setAllTrajectories] = useState<DailyTrajectory[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [yieldStats, setYieldStats] = useState<ReturnType<typeof calculateYieldStats> | null>(null);

  // 正式运行：从数据库轮询最新设备状态（由 /api/telemetry 更新 machines 表）
  const {
    data: dbMachines,
    isLoading: dbLoading,
  } = trpc.machines.list.useQuery(undefined, {
    enabled: !isSimulateMode,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (isSimulateMode) return;
    setIsLoading(dbLoading);
    if (!dbMachines) {
      setFleet([]);
      return;
    }

    const toNumber = (v: any): number => {
      if (v === null || v === undefined) return NaN;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const mapped: MachineData[] = dbMachines.map((m: any) => {
      const lat = toNumber(m.currentLat);
      const lng = toNumber(m.currentLng);
      const speed = toNumber(m.currentSpeed);
      const fuel = toNumber(m.fuelLevel);

      const derivedStatus: MachineData["status"] =
        m.status === "offline" ? "offline" :
        m.status === "maintenance" ? "off" :
        (Number.isFinite(speed) && speed > 1 ? "moving" : "power_on");

      return {
        id: Number(m.id),
        name: m.name ?? `设备 #${m.id}`,
        serial: m.deviceId ?? m.licensePlate ?? String(m.id),
        type: (m.type === "harvester" || m.type === "tractor") ? m.type : "tractor",
        brand: m.brand ?? "john_deere",
        model: m.model ?? "",
        status: derivedStatus,
        statusText: derivedStatus === "moving" ? "Moving" : derivedStatus === "power_on" ? "Online" : derivedStatus,
        fuel: Number.isFinite(fuel) ? Math.max(0, Math.min(100, fuel)) : 0,
        def: 0,
        load: 0,
        lat,
        lng,
        heading: 0,
        params: {
          rpm: 0,
          speed: Number.isFinite(speed) ? speed : 0,
          fuelRate: 0,
          intakeHumidity: 0,
          pressure: 0,
          airTemp: 0,
          fuelTemp: 0,
          defLevel: 0,
          defTemp: 0,
          defRate: 0,
          defPressure: 0,
          scrInTemp: 0,
          scrOutTemp: 0,
          dpfSoot: 0,
          dpfDiffPressure: 0,
          docInTemp: 0,
          docOutTemp: 0,
          ptoSpeed: 0,
          hitchPos: 0,
          hitchForce: 0,
          engineOilHealth: 0,
          hydraulicOilHealth: 0,
          filterHealth: 0,
        },
      };
    });

    setFleet(mapped);
  }, [dbMachines, dbLoading, isSimulateMode]);

  // Initialize History Data for ALL machines
  useEffect(() => {
    // 正式运行：不注入任何模拟历史数据（全部归零）
    if (!isSimulateMode) {
      setDailyLogs({});
      setDailyTrajectories({});
      setAllLogs([]);
      setAllTrajectories([]);
      setAlerts([]);
      setYieldStats(null);
      return;
    }
    const { logs, trajectories, alerts: generatedAlerts } = generateAllHistory();
    const stats = calculateYieldStats(logs);
    
    // 按机器ID分组日志
    const logsByMachine: Record<number, DailyLog[]> = {};
    const trajByMachine: Record<number, DailyTrajectory[]> = {};
    
    logs.forEach(log => {
      if (!logsByMachine[log.machineId]) logsByMachine[log.machineId] = [];
      logsByMachine[log.machineId].push(log);
    });
    
    trajectories.forEach(traj => {
      if (!trajByMachine[traj.machineId]) trajByMachine[traj.machineId] = [];
      trajByMachine[traj.machineId].push(traj);
    });

    setDailyLogs(logsByMachine);
    setDailyTrajectories(trajByMachine);
    setAllLogs(logs);
    setAllTrajectories(trajectories);
    setAlerts(generatedAlerts);
    setYieldStats(stats);
  }, [isSimulateMode]); // Run when mode changes

  // Derived Global Stats
  const globalStats = {
    totalArea: fleet.reduce((sum, m) => sum + (m.areaWorked || 0), 0),
    dailyProgress: Math.min(100, Math.round((fleet.reduce((sum, m) => sum + (m.areaWorked || 0), 0) / 500) * 100)), // Assuming 500 mu target
    activeCount: fleet.filter(m => m.status === 'working').length,
    movingCount: fleet.filter(m => m.status === 'moving').length,
    offlineCount: fleet.filter(m => m.status === 'offline' || m.status === 'off').length,
  };

  // Simulation loop (Only runs when selectedDate is TODAY)
  useEffect(() => {
    // 正式运行：不跑模拟循环，避免数据污染
    if (!isSimulateMode) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    if (selectedDate !== today) return; // Stop simulation when viewing history

    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;

      setFleet(prevFleet => {
        const updatedFleet = prevFleet.map(machine => {
          // Offline/Off machines don't fluctuate
          if (machine.status === 'off' || machine.status === 'offline') {
             return {
               ...machine,
               load: 0,
               // 保持上次的yield值，不清零（用于显示历史数据）
               params: {
                 ...machine.params,
                 rpm: 0,
                 speed: 0,
                 fuelRate: 0,
                 scrInTemp: 20, // Ambient temp
               }
             };
          }

          let newParams = { ...machine.params };
          let newLoad = machine.load;
          let newYield = machine.yield;
          let newMoisture = machine.moisture;
          let newGrainTank = machine.grainTank;
          let newTotalYield = machine.totalYield;
          let newAreaWorked = machine.areaWorked;

          if (machine.status === 'working' || machine.status === 'moving') {
            // Core params fluctuation
            newParams.rpm = Math.round(fluctuate(machine.params.rpm, 30, 800, 2600));
            newParams.speed = Number(fluctuate(machine.params.speed, 0.2, 0, 40).toFixed(1));
            newParams.fuelRate = Number(fluctuate(machine.params.fuelRate, 2, 5, 80).toFixed(1));
            newLoad = Math.round(fluctuate(machine.load, 3, 0, 100));

            // Harvester specific logic
            if (machine.type === 'harvester' && machine.status === 'working') {
              // Yield fluctuates based on "field conditions"
              newYield = Math.round(fluctuate(machine.yield || 850, 50, 600, 1100));
              
              // Moisture fluctuates slightly
              newMoisture = Number(fluctuate(machine.moisture || 14.5, 0.1, 13.5, 16.0).toFixed(1));
              
              // Grain tank fills up slowly (0.1% per tick)
              if (newGrainTank !== undefined && newGrainTank < 100) {
                newGrainTank = Number(Math.min(100, newGrainTank + 0.1).toFixed(1));
              }
              
              // Accumulate totals
              if (newTotalYield !== undefined) newTotalYield = Number((newTotalYield + (newYield! / 3600)).toFixed(1)); // Rough approximation
              if (newAreaWorked !== undefined) newAreaWorked = Number((newAreaWorked + 0.001).toFixed(2));
            }
          }

          return {
            ...machine,
            load: newLoad,
            yield: newYield,
            moisture: newMoisture,
            grainTank: newGrainTank,
            totalYield: newTotalYield,
            areaWorked: newAreaWorked,
            params: newParams
          };
        });

        // Update Fuel History
        setFuelHistory(prev => {
          const next = { ...prev };
          updatedFleet.forEach(m => {
            if (!next[m.id]) next[m.id] = Array(20).fill(0);
            const history = [...next[m.id], m.params.fuelRate];
            if (history.length > 20) history.shift(); // Keep last 20 points
            next[m.id] = history;
          });
          return next;
        });

        return updatedFleet;
      });
    }, 1000); // Update every second for smoother animation

    return () => clearInterval(interval);
  }, [selectedDate, isSimulateMode]);

  const getMachineById = (id: number) => fleet.find(m => m.id === id);
  
  const getDailyLog = (machineId: number, date: string) => {
    return dailyLogs[machineId]?.find(log => log.date === date);
  };

  const getDailyTrajectory = (machineId: number, date: string) => {
    return dailyTrajectories[machineId]?.find(traj => traj.date === date);
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, resolved: true, resolvedAt: new Date() }
        : alert
    ));
  };

  const unresolvedAlertCount = alerts.filter(a => !a.resolved).length;

  return (
    <FleetContext.Provider value={{ 
      fleet, 
      getMachineById, 
      activeMachineId, 
      setActiveMachineId,
      isLoading,
      globalStats,
      fuelHistory,
      selectedDate,
      setSelectedDate,
      dailyLogs,
      dailyTrajectories,
      getDailyLog,
      getDailyTrajectory,
      allLogs,
      allTrajectories,
      alerts,
      yieldStats,
      resolveAlert,
      unresolvedAlertCount
    }}>
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (context === undefined) {
    throw new Error("useFleet must be used within a FleetProvider");
  }
  return context;
};
