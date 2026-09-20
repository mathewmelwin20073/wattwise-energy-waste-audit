export type SeverityLevel = 'High' | 'Medium' | 'Low';

export type EventStatus = 'New' | 'Investigating' | 'Resolved' | 'False alarm';

export type WasteRuleId =
  | 'rule_1_beyond_schedule'
  | 'rule_2_after_hours'
  | 'rule_3_excessive_operation';

export interface Equipment {
  id: string;
  name: string;
  powerKW: number; // e.g. 2.0 kW
}

export interface Room {
  id: string;
  name: string; // e.g. "Room 204"
  floor: string; // e.g. "Floor 2"
  scheduledStart: string; // HH:MM (e.g. "09:00")
  scheduledEnd: string; // HH:MM (e.g. "10:00")
  equipment: Equipment[];
}

export interface EquipmentRunRecord {
  roomId: string;
  equipmentId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM or "" if did not run
  endTime: string; // HH:MM or "" if did not run
}

export interface BuildingSettings {
  buildingOpen: string; // HH:MM e.g. "08:00"
  buildingClose: string; // HH:MM e.g. "18:00"
  gracePeriodMinutes: number; // e.g. 15
  excessiveMultiplier: number; // e.g. 1.5
  mediumSeverityThresholdKW: number; // e.g. 2.0 kWh
  highSeverityThresholdKW: number; // e.g. 5.0 kWh
  electricityTariff: number; // e.g. 8.00 per kWh
  currencySymbol: string; // e.g. "₹"
  co2Factor: number; // e.g. 0.82 kg CO2 per kWh
}

export interface TriggeredRule {
  id: WasteRuleId;
  name: string;
  description: string;
  numbers: string;
}

export interface WasteEvent {
  id: string;
  roomId: string;
  roomName: string;
  floor: string;
  equipmentId: string;
  equipmentName: string;
  powerKW: number;
  date: string;
  startTime: string;
  endTime: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualDurationHours: number;
  scheduledDurationHours: number;
  avoidableHours: number;
  avoidableEnergyKWh: number;
  estimatedCost: number;
  estimatedCO2Kg: number;
  severity: SeverityLevel;
  triggeredRules: TriggeredRule[];
  sentence: string;
  calculationString: string;
  repeatCountIn7Days: number;
  status: EventStatus;
}

export interface HourlyWasteCell {
  hour: number; // 0 to 23
  roomId: string;
  roomName: string;
  avoidableEnergyKWh: number;
  equipmentBreakdown: { equipmentName: string; kWh: number }[];
}

export interface WhatIfParameters {
  roomCount: number;
  powerKWPerRoom: number;
  unnecessaryHoursPerDay: number;
  daysPerMonth: number;
  shutdownPracticeReductionPct: number; // e.g. 25 (%)
}
