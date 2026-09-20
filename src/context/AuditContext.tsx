import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_DATES, INITIAL_RECORDS, INITIAL_ROOMS, INITIAL_SETTINGS } from '../data/demoData';
import {
  BuildingSettings,
  Equipment,
  EquipmentRunRecord,
  EventStatus,
  Room,
  WasteEvent,
} from '../types';
import { evaluateEquipmentRun } from '../utils/detection';

export type TabId = 'dashboard' | 'room-analysis' | 'waste-audit' | 'what-if' | 'settings';

interface ToastNotice {
  text: string;
  type: 'success' | 'error';
}

interface AuditContextType {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  selectedRoomId: string;
  setSelectedRoomId: (id: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dashboardPeriod: 'latest' | '7days';
  setDashboardPeriod: (period: 'latest' | '7days') => void;
  openRoom: (roomId: string, date?: string) => void;

  settings: BuildingSettings;
  updateSettings: (newSettings: BuildingSettings) => void;

  rooms: Room[];
  addRoom: (name: string, floor: string, scheduledStart: string, scheduledEnd: string) => boolean;
  removeRoom: (roomId: string) => void;
  addEquipment: (roomId: string, name: string, powerKW: number) => boolean;
  removeEquipment: (roomId: string, equipmentId: string) => void;
  updateRoomSchedule: (roomId: string, start: string, end: string) => boolean;

  records: EquipmentRunRecord[];
  updateEquipmentRun: (
    roomId: string,
    equipmentId: string,
    date: string,
    startTime: string,
    endTime: string
  ) => boolean;
  clearEquipmentRun: (roomId: string, equipmentId: string, date: string) => void;
  availableDates: string[];
  addDay: (date: string) => boolean;

  eventStatuses: Record<string, EventStatus>;
  setEventStatus: (eventId: string, status: EventStatus) => void;

  isDemoMode: boolean;
  resetToDemo: () => void;
  clearAllData: () => void;

  toast: ToastNotice | null;
  showToast: (text: string, type?: 'success' | 'error') => void;

  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Derived calculations
  allEvents: WasteEvent[];
  latestDayEvents: WasteEvent[];
  last7DaysEvents: WasteEvent[];
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

const STORAGE_KEY = 'energy_audit_state_v1';

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved state or defaults
  const [settings, setSettings] = useState<BuildingSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_rooms');
      return saved ? JSON.parse(saved) : INITIAL_ROOMS;
    } catch {
      return INITIAL_ROOMS;
    }
  });

  const [records, setRecords] = useState<EquipmentRunRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_records');
      return saved ? JSON.parse(saved) : INITIAL_RECORDS;
    } catch {
      return INITIAL_RECORDS;
    }
  });

  const [availableDates, setAvailableDates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_dates');
      return saved ? JSON.parse(saved) : DEMO_DATES;
    } catch {
      return DEMO_DATES;
    }
  });

  const [eventStatuses, setEventStatuses] = useState<Record<string, EventStatus>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_is_demo');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room_204');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-18');
  const [dashboardPeriod, setDashboardPeriod] = useState<'latest' | '7days'>('latest');

  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
      return 'system';
    } catch {
      return 'system';
    }
  });

  // Sync dark theme with document
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        root.setAttribute('data-theme', 'light');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEY + '_rooms', JSON.stringify(rooms));
      localStorage.setItem(STORAGE_KEY + '_records', JSON.stringify(records));
      localStorage.setItem(STORAGE_KEY + '_dates', JSON.stringify(availableDates));
      localStorage.setItem(STORAGE_KEY + '_statuses', JSON.stringify(eventStatuses));
      localStorage.setItem(STORAGE_KEY + '_is_demo', JSON.stringify(isDemoMode));
      localStorage.setItem(STORAGE_KEY + '_theme', theme);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [settings, rooms, records, availableDates, eventStatuses, isDemoMode, theme]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    setThemeState(t);
  };

  // Open Room navigation shortcut
  const openRoom = (roomId: string, date?: string) => {
    setSelectedRoomId(roomId);
    if (date) {
      setSelectedDate(date);
    }
    setActiveTab('room-analysis');
  };

  // Update Building settings
  const updateSettings = (newSettings: BuildingSettings) => {
    setSettings(newSettings);
    setIsDemoMode(false);
    showToast('Saved.', 'success');
  };

  // Rooms management
  const addRoom = (
    name: string,
    floor: string,
    scheduledStart: string,
    scheduledEnd: string
  ): boolean => {
    if (!name.trim()) {
      showToast('Room name cannot be empty.', 'error');
      return false;
    }
    if (scheduledEnd <= scheduledStart) {
      showToast('The scheduled end time must be after the start time.', 'error');
      return false;
    }

    const newId = `room_${Date.now()}`;
    const newRoom: Room = {
      id: newId,
      name: name.trim(),
      floor: floor.trim() || 'Floor 1',
      scheduledStart,
      scheduledEnd,
      equipment: [],
    };

    setRooms((prev) => [...prev, newRoom]);
    setIsDemoMode(false);
    showToast('Saved.', 'success');
    return true;
  };

  const removeRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setRecords((prev) => prev.filter((rec) => rec.roomId !== roomId));
    if (selectedRoomId === roomId && rooms.length > 1) {
      const remaining = rooms.find((r) => r.id !== roomId);
      if (remaining) setSelectedRoomId(remaining.id);
    }
    setIsDemoMode(false);
    showToast('Saved.', 'success');
  };

  const addEquipment = (roomId: string, name: string, powerKW: number): boolean => {
    if (!name.trim()) {
      showToast('Equipment name cannot be empty.', 'error');
      return false;
    }
    if (powerKW <= 0 || isNaN(powerKW)) {
      showToast('Power rating must be greater than 0 kW.', 'error');
      return false;
    }

    const eqId = `eq_${Date.now()}`;
    const newEquipment: Equipment = {
      id: eqId,
      name: name.trim(),
      powerKW: Number(powerKW.toFixed(2)),
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            equipment: [...r.equipment, newEquipment],
          };
        }
        return r;
      })
    );

    setIsDemoMode(false);
    showToast('Saved.', 'success');
    return true;
  };

  const removeEquipment = (roomId: string, equipmentId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            equipment: r.equipment.filter((e) => e.id !== equipmentId),
          };
        }
        return r;
      })
    );
    setRecords((prev) =>
      prev.filter((rec) => !(rec.roomId === roomId && rec.equipmentId === equipmentId))
    );
    setIsDemoMode(false);
    showToast('Saved.', 'success');
  };

  const updateRoomSchedule = (roomId: string, start: string, end: string): boolean => {
    if (end <= start) {
      showToast('The scheduled end time must be after the start time.', 'error');
      return false;
    }

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            scheduledStart: start,
            scheduledEnd: end,
          };
        }
        return r;
      })
    );
    setIsDemoMode(false);
    showToast('Saved.', 'success');
    return true;
  };

  // Logs management
  const updateEquipmentRun = (
    roomId: string,
    equipmentId: string,
    date: string,
    startTime: string,
    endTime: string
  ): boolean => {
    if (startTime && endTime && endTime <= startTime) {
      showToast('The switched off time must be after the switched on time.', 'error');
      return false;
    }

    setRecords((prev) => {
      const filtered = prev.filter(
        (rec) =>
          !(rec.roomId === roomId && rec.equipmentId === equipmentId && rec.date === date)
      );
      if (!startTime && !endTime) {
        return filtered;
      }
      return [
        ...filtered,
        {
          roomId,
          equipmentId,
          date,
          startTime,
          endTime,
        },
      ];
    });

    setIsDemoMode(false);
    showToast('Saved.', 'success');
    return true;
  };

  const clearEquipmentRun = (roomId: string, equipmentId: string, date: string) => {
    setRecords((prev) =>
      prev.filter(
        (rec) =>
          !(rec.roomId === roomId && rec.equipmentId === equipmentId && rec.date === date)
      )
    );
    setIsDemoMode(false);
    showToast('Saved.', 'success');
  };

  const addDay = (date: string): boolean => {
    if (!date) {
      showToast('Please select a valid date.', 'error');
      return false;
    }
    if (availableDates.includes(date)) {
      showToast('This day is already in the system.', 'error');
      return false;
    }

    const updated = [date, ...availableDates].sort().reverse();
    setAvailableDates(updated);
    setSelectedDate(date);
    setIsDemoMode(false);
    showToast('Saved.', 'success');
    return true;
  };

  const setEventStatus = (eventId: string, status: EventStatus) => {
    setEventStatuses((prev) => ({
      ...prev,
      [eventId]: status,
    }));
    showToast('Saved.', 'success');
  };

  const resetToDemo = () => {
    setSettings(INITIAL_SETTINGS);
    setRooms(INITIAL_ROOMS);
    setRecords(INITIAL_RECORDS);
    setAvailableDates(DEMO_DATES);
    setEventStatuses({});
    setIsDemoMode(true);
    setSelectedRoomId('room_204');
    setSelectedDate('2026-09-18');
    showToast('Reset to demo data.', 'success');
  };

  const clearAllData = () => {
    setRooms([]);
    setRecords([]);
    setAvailableDates([]);
    setEventStatuses({});
    setIsDemoMode(false);
    showToast('All custom data cleared.', 'success');
  };

  // Evaluate all events across the dataset
  const allEvents = useMemo(() => {
    const events: WasteEvent[] = [];
    const roomsMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));

    for (const record of records) {
      const room = roomsMap.get(record.roomId);
      if (!room) continue;

      const pastRecordsForEq = records.filter(
        (r) => r.roomId === record.roomId && r.equipmentId === record.equipmentId
      );

      const ev = evaluateEquipmentRun(
        room,
        record.equipmentId,
        record,
        settings,
        eventStatuses,
        pastRecordsForEq
      );

      if (ev) {
        events.push(ev);
      }
    }

    // Sort by date desc, then severity desc, then energy desc
    const severityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    events.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      const diff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (diff !== 0) return diff;
      return b.avoidableEnergyKWh - a.avoidableEnergyKWh;
    });

    return events;
  }, [rooms, records, settings, eventStatuses]);

  const latestDate = availableDates[0] || '2026-09-18';

  const latestDayEvents = useMemo(() => {
    return allEvents.filter((ev) => ev.date === latestDate);
  }, [allEvents, latestDate]);

  const last7DaysEvents = useMemo(() => {
    const dates7 = availableDates.slice(0, 7);
    return allEvents.filter((ev) => dates7.includes(ev.date));
  }, [allEvents, availableDates]);

  return (
    <AuditContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedRoomId,
        setSelectedRoomId,
        selectedDate,
        setSelectedDate,
        dashboardPeriod,
        setDashboardPeriod,
        openRoom,
        settings,
        updateSettings,
        rooms,
        addRoom,
        removeRoom,
        addEquipment,
        removeEquipment,
        updateRoomSchedule,
        records,
        updateEquipmentRun,
        clearEquipmentRun,
        availableDates,
        addDay,
        eventStatuses,
        setEventStatus,
        isDemoMode,
        resetToDemo,
        clearAllData,
        toast,
        showToast,
        theme,
        setTheme,
        allEvents,
        latestDayEvents,
        last7DaysEvents,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
