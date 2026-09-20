import {
  BuildingSettings,
  EquipmentRunRecord,
  EventStatus,
  HourlyWasteCell,
  Room,
  SeverityLevel,
  TriggeredRule,
  WasteEvent,
} from '../types';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTimeAmPm(timeStr: string): string {
  if (!timeStr) return '';
  const min = timeToMinutes(timeStr);
  const hours24 = Math.floor(min / 60);
  const minutes = min % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minuteStr = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`;
  return `${hours12}${minuteStr} ${period}`;
}

export function formatDurationHours(hours: number): string {
  if (hours % 1 === 0) {
    return `${hours.toFixed(0)} h`;
  }
  return `${hours.toFixed(1)} h`;
}

export function formatEnergy(kWh: number): string {
  return `${kWh.toFixed(1)} kWh`;
}

export function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export function formatCostDetailed(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Evaluates whether an equipment run constitutes waste and creates a WasteEvent if so.
 */
export function evaluateEquipmentRun(
  room: Room,
  equipmentId: string,
  record: EquipmentRunRecord,
  settings: BuildingSettings,
  statusMap: Record<string, EventStatus>,
  allRecordsForEquipmentIn7Days: EquipmentRunRecord[],
): WasteEvent | null {
  if (!record.startTime || !record.endTime) {
    return null;
  }

  const equipment = room.equipment.find((e) => e.id === equipmentId);
  if (!equipment) return null;

  const runStartMin = timeToMinutes(record.startTime);
  const runEndMin = timeToMinutes(record.endTime);
  if (runEndMin <= runStartMin) return null;

  const schedStartMin = timeToMinutes(room.scheduledStart);
  const schedEndMin = timeToMinutes(room.scheduledEnd);
  const schedDurationMin = Math.max(0, schedEndMin - schedStartMin);
  const runDurationMin = runEndMin - runStartMin;

  const buildingOpenMin = timeToMinutes(settings.buildingOpen);
  const buildingCloseMin = timeToMinutes(settings.buildingClose);

  // Analyze minute-by-minute for schedule and after-hours overlap
  let avoidableMinutes = 0;
  let minutesAfterHours = 0;
  let minutesOutsideSchedule = 0;

  for (let m = runStartMin; m < runEndMin; m++) {
    const isInsideSchedule = m >= schedStartMin && m < schedEndMin + settings.gracePeriodMinutes;
    const isInsideBuildingHours = m >= buildingOpenMin && m < buildingCloseMin;

    const outsideSched = !isInsideSchedule;
    const afterHours = !isInsideBuildingHours;

    if (outsideSched) minutesOutsideSchedule++;
    if (afterHours) minutesAfterHours++;

    if (outsideSched || afterHours) {
      avoidableMinutes++;
    }
  }

  const avoidableHours = avoidableMinutes / 60;
  const actualDurationHours = runDurationMin / 60;
  const scheduledDurationHours = schedDurationMin / 60;

  // Check Rules
  const triggeredRules: TriggeredRule[] = [];

  // Rule 1: Operation Beyond Schedule
  const excessOverSchedule = runDurationMin - schedDurationMin;
  if (excessOverSchedule > settings.gracePeriodMinutes) {
    const excessHours = excessOverSchedule / 60;
    triggeredRules.push({
      id: 'rule_1_beyond_schedule',
      name: 'Rule 1: Operation beyond schedule',
      description: 'Equipment ran longer than the planned room schedule.',
      numbers: `Actual ${formatDurationHours(actualDurationHours)} vs scheduled ${formatDurationHours(
        scheduledDurationHours
      )} (+${formatDurationHours(excessHours)} overrun)`,
    });
  }

  // Rule 2: After-Hours Operation
  if (minutesAfterHours > settings.gracePeriodMinutes) {
    const afterHoursDur = minutesAfterHours / 60;
    triggeredRules.push({
      id: 'rule_2_after_hours',
      name: 'Rule 2: After-hours operation',
      description: 'Equipment operated outside designated building open hours.',
      numbers: `${formatDurationHours(afterHoursDur)} ran outside ${settings.buildingOpen}–${settings.buildingClose}`,
    });
  }

  // Rule 3: Excessive Operation
  if (
    schedDurationMin > 0 &&
    runDurationMin >= schedDurationMin * settings.excessiveMultiplier &&
    runDurationMin - schedDurationMin > settings.gracePeriodMinutes
  ) {
    triggeredRules.push({
      id: 'rule_3_excessive_operation',
      name: 'Rule 3: Excessive operation',
      description: 'Equipment operated significantly longer than normal operating limits.',
      numbers: `Duration ratio ${(runDurationMin / schedDurationMin).toFixed(1)}× exceeds threshold ${settings.excessiveMultiplier}×`,
    });
  }

  // If no avoidable hours or no rules, it ran normally
  if (avoidableHours <= 0 || triggeredRules.length === 0) {
    return null;
  }

  const avoidableEnergyKWh = Number((equipment.powerKW * avoidableHours).toFixed(2));
  const estimatedCost = Number((avoidableEnergyKWh * settings.electricityTariff).toFixed(2));
  const estimatedCO2Kg = Number((avoidableEnergyKWh * settings.co2Factor).toFixed(2));

  // Determine severity based on avoidable kWh thresholds
  let severity: SeverityLevel = 'Low';
  if (avoidableEnergyKWh >= settings.highSeverityThresholdKW) {
    severity = 'High';
  } else if (avoidableEnergyKWh >= settings.mediumSeverityThresholdKW) {
    severity = 'Medium';
  }

  // Repeat count in last 7 days
  let repeatCountIn7Days = 0;
  for (const pastRec of allRecordsForEquipmentIn7Days) {
    if (pastRec.startTime && pastRec.endTime) {
      const pStart = timeToMinutes(pastRec.startTime);
      const pEnd = timeToMinutes(pastRec.endTime);
      if (pEnd - pStart > schedDurationMin + settings.gracePeriodMinutes) {
        repeatCountIn7Days++;
      }
    }
  }
  if (repeatCountIn7Days === 0) repeatCountIn7Days = 1;

  // Plain-language alert sentence as required
  let sentence = '';
  if (minutesAfterHours > minutesOutsideSchedule) {
    sentence = `${equipment.name} ran ${formatDurationHours(
      avoidableHours
    )} outside building hours (about ${avoidableEnergyKWh.toFixed(1)} kWh).`;
  } else {
    sentence = `${equipment.name} ran ${formatDurationHours(
      avoidableHours
    )} beyond its schedule (about ${avoidableEnergyKWh.toFixed(1)} kWh).`;
  }

  const calculationString = `E = P × t = ${equipment.powerKW.toFixed(2)} kW × ${avoidableHours.toFixed(
    2
  )} h = ${avoidableEnergyKWh.toFixed(2)} kWh`;

  const eventId = `${record.date}_${room.id}_${equipment.id}`;
  const savedStatus = statusMap[eventId] || 'New';

  return {
    id: eventId,
    roomId: room.id,
    roomName: room.name,
    floor: room.floor,
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    powerKW: equipment.powerKW,
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
    scheduledStart: room.scheduledStart,
    scheduledEnd: room.scheduledEnd,
    actualDurationHours,
    scheduledDurationHours,
    avoidableHours,
    avoidableEnergyKWh,
    estimatedCost,
    estimatedCO2Kg,
    severity,
    triggeredRules,
    sentence,
    calculationString,
    repeatCountIn7Days,
    status: savedStatus,
  };
}

/**
 * Calculates hourly avoidable energy for a room on a given day (or across multiple days).
 */
export function calculateHourlyAvoidableEnergy(
  room: Room,
  recordsForRoom: EquipmentRunRecord[],
  settings: BuildingSettings
): number[] {
  const hoursKWh = new Array(24).fill(0);

  const schedStartMin = timeToMinutes(room.scheduledStart);
  const schedEndMin = timeToMinutes(room.scheduledEnd);
  const buildingOpenMin = timeToMinutes(settings.buildingOpen);
  const buildingCloseMin = timeToMinutes(settings.buildingClose);

  for (const record of recordsForRoom) {
    if (!record.startTime || !record.endTime) continue;
    const equipment = room.equipment.find((e) => e.id === record.equipmentId);
    if (!equipment) continue;

    const runStartMin = timeToMinutes(record.startTime);
    const runEndMin = timeToMinutes(record.endTime);
    if (runEndMin <= runStartMin) continue;

    for (let h = 0; h < 24; h++) {
      const hourStartMin = h * 60;
      const hourEndMin = (h + 1) * 60;

      // Overlap of run with this hour
      const overlapStart = Math.max(runStartMin, hourStartMin);
      const overlapEnd = Math.min(runEndMin, hourEndMin);

      if (overlapEnd > overlapStart) {
        let avoidableMinutesInHour = 0;
        for (let m = overlapStart; m < overlapEnd; m++) {
          const isInsideSchedule =
            m >= schedStartMin && m < schedEndMin + settings.gracePeriodMinutes;
          const isInsideBuildingHours = m >= buildingOpenMin && m < buildingCloseMin;
          if (!isInsideSchedule || !isInsideBuildingHours) {
            avoidableMinutesInHour++;
          }
        }
        if (avoidableMinutesInHour > 0) {
          const kWh = equipment.powerKW * (avoidableMinutesInHour / 60);
          hoursKWh[h] += kWh;
        }
      }
    }
  }

  return hoursKWh.map((k) => Number(k.toFixed(2)));
}

/**
 * Generates the full 24-hour heatmap matrix for all rooms.
 */
export function generateHeatmapData(
  rooms: Room[],
  records: EquipmentRunRecord[],
  settings: BuildingSettings
): {
  rows: {
    room: Room;
    hourlyKWh: number[];
    totalKWh: number;
  }[];
  peakHour: number;
  peakHourKWh: number;
  worstRoom: Room | null;
} {
  const rows = rooms.map((room) => {
    const roomRecords = records.filter((r) => r.roomId === room.id);
    const hourlyKWh = calculateHourlyAvoidableEnergy(room, roomRecords, settings);
    const totalKWh = Number(hourlyKWh.reduce((sum, v) => sum + v, 0).toFixed(1));
    return {
      room,
      hourlyKWh,
      totalKWh,
    };
  });

  // Sort worst to best (descending total kWh)
  rows.sort((a, b) => b.totalKWh - a.totalKWh);

  // Find peak waste hour across all rooms
  const totalByHour = new Array(24).fill(0);
  rows.forEach((row) => {
    row.hourlyKWh.forEach((val, h) => {
      totalByHour[h] += val;
    });
  });

  let peakHour = 18;
  let maxHourKWh = 0;
  totalByHour.forEach((val, h) => {
    if (val > maxHourKWh) {
      maxHourKWh = val;
      peakHour = h;
    }
  });

  const worstRoom = rows.length > 0 && rows[0].totalKWh > 0 ? rows[0].room : null;

  return {
    rows,
    peakHour,
    peakHourKWh: Number(maxHourKWh.toFixed(1)),
    worstRoom,
  };
}

/**
 * Format date nicely: "2026-09-18" -> "Fri, Sep 18"
 */
export function formatDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
