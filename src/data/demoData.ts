import { BuildingSettings, EquipmentRunRecord, Room } from '../types';

export const INITIAL_SETTINGS: BuildingSettings = {
  buildingOpen: '08:00',
  buildingClose: '18:00',
  gracePeriodMinutes: 15,
  excessiveMultiplier: 1.5,
  mediumSeverityThresholdKW: 2.0,
  highSeverityThresholdKW: 5.0,
  electricityTariff: 8.0, // ₹8.00 / kWh
  currencySymbol: '₹',
  co2Factor: 0.82, // 0.82 kg CO2 / kWh
};

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room_204',
    name: 'Room 204',
    floor: 'Floor 2',
    scheduledStart: '09:00',
    scheduledEnd: '10:00',
    equipment: [
      { id: 'eq_r204_ac', name: 'Air conditioner', powerKW: 2.0 },
      { id: 'eq_r204_proj', name: 'Classroom projector', powerKW: 0.35 },
    ],
  },
  {
    id: 'room_101',
    name: 'Room 101',
    floor: 'Floor 1',
    scheduledStart: '08:30',
    scheduledEnd: '16:30',
    equipment: [
      { id: 'eq_r101_hvac', name: 'Central HVAC zone', powerKW: 3.5 },
      { id: 'eq_r101_lights', name: 'Overhead light array', powerKW: 0.6 },
    ],
  },
  {
    id: 'room_102',
    name: 'Room 102',
    floor: 'Floor 1',
    scheduledStart: '10:00',
    scheduledEnd: '13:00',
    equipment: [
      { id: 'eq_r102_ac', name: 'Split AC unit', powerKW: 1.8 },
      { id: 'eq_r102_disp', name: 'Interactive display', powerKW: 0.25 },
    ],
  },
  {
    id: 'room_305',
    name: 'Room 305',
    floor: 'Floor 3',
    scheduledStart: '13:00',
    scheduledEnd: '17:00',
    equipment: [
      { id: 'eq_r305_vent', name: 'Fume hood & ventilation', powerKW: 2.2 },
      { id: 'eq_r305_rig', name: 'Materials test bench', powerKW: 4.0 },
    ],
  },
  {
    id: 'room_210',
    name: 'Room 210',
    floor: 'Floor 2',
    scheduledStart: '11:00',
    scheduledEnd: '14:00',
    equipment: [
      { id: 'eq_r210_hp', name: 'Heat pump chiller', powerKW: 3.0 },
      { id: 'eq_r210_av', name: 'Media control rack', powerKW: 0.5 },
    ],
  },
];

export const DEMO_DATES = [
  '2026-09-18', // Fri (Latest day)
  '2026-09-17', // Thu
  '2026-09-16', // Wed
  '2026-09-15', // Tue
  '2026-09-14', // Mon
  '2026-09-13', // Sun
  '2026-09-12', // Sat
];

export const INITIAL_RECORDS: EquipmentRunRecord[] = [
  // --- 2026-09-18 (Friday, Latest day) ---
  // Room 204: AC runs 09:00 - 12:00 (exact proposal scenario: scheduled 9-10, runs 9-12 => 2h excess, 4 kWh)
  {
    roomId: 'room_204',
    equipmentId: 'eq_r204_ac',
    date: '2026-09-18',
    startTime: '09:00',
    endTime: '12:00',
  },
  {
    roomId: 'room_204',
    equipmentId: 'eq_r204_proj',
    date: '2026-09-18',
    startTime: '09:00',
    endTime: '11:30',
  },
  // Room 101: HVAC ran past building hours until 20:30 (building closes 18:00)
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_hvac',
    date: '2026-09-18',
    startTime: '08:30',
    endTime: '20:30',
  },
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_lights',
    date: '2026-09-18',
    startTime: '08:30',
    endTime: '19:45',
  },
  // Room 102: Perfectly followed schedule 10:00 - 13:00 (NO WASTE!)
  {
    roomId: 'room_102',
    equipmentId: 'eq_r102_ac',
    date: '2026-09-18',
    startTime: '10:00',
    endTime: '13:00',
  },
  {
    roomId: 'room_102',
    equipmentId: 'eq_r102_disp',
    date: '2026-09-18',
    startTime: '10:00',
    endTime: '13:00',
  },
  // Room 305: Test bench left on overnight/late
  {
    roomId: 'room_305',
    equipmentId: 'eq_r305_vent',
    date: '2026-09-18',
    startTime: '13:00',
    endTime: '19:00',
  },
  {
    roomId: 'room_305',
    equipmentId: 'eq_r305_rig',
    date: '2026-09-18',
    startTime: '13:00',
    endTime: '17:00',
  },
  // Room 210: Heat pump chiller ran 11:00 to 17:00 (3h excess)
  {
    roomId: 'room_210',
    equipmentId: 'eq_r210_hp',
    date: '2026-09-18',
    startTime: '11:00',
    endTime: '17:00',
  },
  {
    roomId: 'room_210',
    equipmentId: 'eq_r210_av',
    date: '2026-09-18',
    startTime: '11:00',
    endTime: '14:00',
  },

  // --- 2026-09-17 (Thursday) ---
  {
    roomId: 'room_204',
    equipmentId: 'eq_r204_ac',
    date: '2026-09-17',
    startTime: '09:00',
    endTime: '12:30',
  },
  {
    roomId: 'room_204',
    equipmentId: 'eq_r204_proj',
    date: '2026-09-17',
    startTime: '09:00',
    endTime: '10:00',
  },
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_hvac',
    date: '2026-09-17',
    startTime: '08:30',
    endTime: '21:00',
  },
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_lights',
    date: '2026-09-17',
    startTime: '08:30',
    endTime: '16:30',
  },
  {
    roomId: 'room_102',
    equipmentId: 'eq_r102_ac',
    date: '2026-09-17',
    startTime: '10:00',
    endTime: '13:00',
  },
  {
    roomId: 'room_305',
    equipmentId: 'eq_r305_vent',
    date: '2026-09-17',
    startTime: '13:00',
    endTime: '21:00',
  },
  {
    roomId: 'room_305',
    equipmentId: 'eq_r305_rig',
    date: '2026-09-17',
    startTime: '13:00',
    endTime: '18:30',
  },
  {
    roomId: 'room_210',
    equipmentId: 'eq_r210_hp',
    date: '2026-09-17',
    startTime: '11:00',
    endTime: '16:00',
  },

  // --- 2026-09-16 (Wednesday) ---
  {
    roomId: 'room_204',
    equipmentId: 'eq_r204_ac',
    date: '2026-09-16',
    startTime: '09:00',
    endTime: '13:00',
  },
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_hvac',
    date: '2026-09-16',
    startTime: '08:30',
    endTime: '19:30',
  },
  {
    roomId: 'room_305',
    equipmentId: 'eq_r305_rig',
    date: '2026-09-16',
    startTime: '13:00',
    endTime: '19:30',
  },

  // --- 2026-09-15 (Tuesday) ---
  {
    roomId: 'room_204',
    equipmentId: 'eq_r204_ac',
    date: '2026-09-15',
    startTime: '09:00',
    endTime: '11:45',
  },
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_hvac',
    date: '2026-09-15',
    startTime: '08:30',
    endTime: '18:00',
  },
  {
    roomId: 'room_210',
    equipmentId: 'eq_r210_hp',
    date: '2026-09-15',
    startTime: '11:00',
    endTime: '16:30',
  },

  // --- 2026-09-14 (Monday) ---
  {
    roomId: 'room_204',
    equipmentId: 'eq_r204_ac',
    date: '2026-09-14',
    startTime: '09:00',
    endTime: '12:15',
  },
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_hvac',
    date: '2026-09-14',
    startTime: '08:30',
    endTime: '20:00',
  },
  {
    roomId: 'room_305',
    equipmentId: 'eq_r305_vent',
    date: '2026-09-14',
    startTime: '13:00',
    endTime: '17:00',
  },

  // --- 2026-09-13 (Sunday) ---
  // Weekend after-hours operation!
  {
    roomId: 'room_101',
    equipmentId: 'eq_r101_lights',
    date: '2026-09-13',
    startTime: '10:00',
    endTime: '16:00',
  },

  // --- 2026-09-12 (Saturday) ---
  {
    roomId: 'room_305',
    equipmentId: 'eq_r305_vent',
    date: '2026-09-12',
    startTime: '09:00',
    endTime: '15:00',
  },
];
