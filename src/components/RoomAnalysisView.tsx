import React, { useEffect, useMemo, useState } from 'react';
import { useAudit } from '../context/AuditContext';
import { EventStatus } from '../types';
import {
  evaluateEquipmentRun,
  formatCostDetailed,
  formatCurrency,
  formatDateDisplay,
  formatDurationHours,
  formatEnergy,
  minutesToTime,
  timeToMinutes,
} from '../utils/detection';

export const RoomAnalysisView: React.FC = () => {
  const {
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    selectedDate,
    setSelectedDate,
    availableDates,
    records,
    settings,
    eventStatuses,
    setEventStatus,
  } = useAudit();

  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  // Replay state (in minutes: 0 to 1440)
  const [replayMinute, setReplayMinute] = useState<number>(9 * 60); // 09:00 default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Auto-play timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setReplayMinute((prev) => {
          if (prev >= 1435) {
            setIsPlaying(false);
            return 1440;
          }
          return prev + 10; // advance 10 mins per tick
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const buildingOpenMin = timeToMinutes(settings.buildingOpen);
  const buildingCloseMin = timeToMinutes(settings.buildingClose);

  const roomSchedStartMin = currentRoom ? timeToMinutes(currentRoom.scheduledStart) : 0;
  const roomSchedEndMin = currentRoom ? timeToMinutes(currentRoom.scheduledEnd) : 0;

  // Run records for this room on selected date
  const roomRecords = useMemo(() => {
    if (!currentRoom) return [];
    return records.filter(
      (r) => r.roomId === currentRoom.id && r.date === selectedDate
    );
  }, [currentRoom, records, selectedDate]);

  // Detected events for this room on selected date
  const roomEvents = useMemo(() => {
    if (!currentRoom) return [];
    const events = [];
    for (const record of roomRecords) {
      const pastRecords = records.filter(
        (r) => r.roomId === currentRoom.id && r.equipmentId === record.equipmentId
      );
      const ev = evaluateEquipmentRun(
        currentRoom,
        record.equipmentId,
        record,
        settings,
        eventStatuses,
        pastRecords
      );
      if (ev) events.push(ev);
    }
    return events;
  }, [currentRoom, roomRecords, records, settings, eventStatuses]);

  const totalAvoidableKWh = roomEvents.reduce((acc, ev) => acc + ev.avoidableEnergyKWh, 0);
  const totalCost = totalAvoidableKWh * settings.electricityTariff;

  // Live status helper for Replay
  const getDeviceReplayStatus = (eqId: string, powerKW: number) => {
    const record = roomRecords.find((r) => r.equipmentId === eqId);
    if (!record || !record.startTime || !record.endTime) {
      return {
        label: 'Off',
        isWaste: false,
        kwh: 0,
      };
    }

    const start = timeToMinutes(record.startTime);
    const end = timeToMinutes(record.endTime);

    if (replayMinute < start || replayMinute >= end) {
      return {
        label: 'Off',
        isWaste: false,
        kwh: 0,
      };
    }

    const insideSchedule =
      replayMinute >= roomSchedStartMin &&
      replayMinute < roomSchedEndMin + settings.gracePeriodMinutes;
    const insideBuildingHours =
      replayMinute >= buildingOpenMin && replayMinute < buildingCloseMin;

    if (insideSchedule && insideBuildingHours) {
      return {
        label: 'On, running within schedule',
        isWaste: false,
        kwh: 0,
      };
    }

    return {
      label: `On, outside schedule or hours (${powerKW.toFixed(1)} kW potentially avoidable)`,
      isWaste: true,
      kwh: powerKW,
    };
  };

  if (!currentRoom) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded border border-slate-200 dark:border-slate-700 text-center">
        <p className="text-slate-600 dark:text-slate-400">No rooms available. Please add rooms in Data and settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Selectors & One-line summary */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Room dropdown */}
            <div>
              <label
                htmlFor="room-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
              >
                Select room
              </label>
              <select
                id="room-select"
                value={currentRoom.id}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="min-h-[40px] px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.floor})
                  </option>
                ))}
              </select>
            </div>

            {/* Day dropdown */}
            <div>
              <label
                htmlFor="day-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
              >
                Select day
              </label>
              <select
                id="day-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="min-h-[40px] px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDateDisplay(d)} ({d})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick avoidable figure */}
          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
            <div className="text-xs uppercase font-medium tracking-wider text-slate-500 dark:text-slate-400">
              Avoidable energy today
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatEnergy(totalAvoidableKWh)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Estimated {formatCurrency(totalCost, settings.currencySymbol)}
            </div>
          </div>
        </div>

        {/* 2. One-line summary */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-sm text-slate-700 dark:text-slate-300">
          <strong>{currentRoom.name}</strong> &bull; {currentRoom.floor} &bull; Scheduled window:{' '}
          <strong>
            {currentRoom.scheduledStart} to {currentRoom.scheduledEnd}
          </strong>{' '}
          ({formatDurationHours((roomSchedEndMin - roomSchedStartMin) / 60)}) &bull; Avoidable energy on{' '}
          {formatDateDisplay(selectedDate)}: <strong>{formatEnergy(totalAvoidableKWh)}</strong>
        </div>
      </div>

      {/* 3. Timeline (visual centerpiece) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            24-hour schedule versus actual run timeline
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare planned scheduled hours with observed operating intervals.
          </p>
        </div>

        {/* Timeline Container with horizontal scrolling on mobile */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px] space-y-4">
            {/* Hour marker headers */}
            <div className="flex text-[11px] font-mono text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1">
              <div className="w-48 shrink-0 font-sans font-bold text-slate-700 dark:text-slate-300 text-xs">
                Equipment
              </div>
              <div className="flex-1 relative h-4">
                {Array.from({ length: 9 }).map((_, i) => {
                  const hour = i * 3; // 00, 03, 06, 09, 12, 15, 18, 21, 24
                  const pct = (hour / 24) * 100;
                  return (
                    <span
                      key={hour}
                      style={{ left: `${pct}%` }}
                      className="absolute -translate-x-1/2"
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Equipment Timeline Rows */}
            {currentRoom.equipment.map((eq) => {
              const record = roomRecords.find((r) => r.equipmentId === eq.id);
              const hasRun = !!(record && record.startTime && record.endTime);
              const runStart = hasRun ? timeToMinutes(record!.startTime) : 0;
              const runEnd = hasRun ? timeToMinutes(record!.endTime) : 0;

              // Compute segments: normal vs overrun
              let normalStart = 0;
              let normalEnd = 0;
              if (hasRun) {
                normalStart = Math.max(runStart, roomSchedStartMin);
                normalEnd = Math.min(runEnd, roomSchedEndMin + settings.gracePeriodMinutes);
              }
              const hasNormalSegment = hasRun && normalEnd > normalStart;

              return (
                <div key={eq.id} className="flex items-center py-2">
                  {/* Left Label */}
                  <div className="w-48 shrink-0 pr-3">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {eq.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {eq.powerKW.toFixed(2)} kW
                    </div>
                  </div>

                  {/* 24-Hour Track */}
                  <div className="flex-1 relative h-9 bg-slate-100 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-sm overflow-hidden">
                    {/* Building working hours background tint */}
                    <div
                      style={{
                        left: `${(buildingOpenMin / 1440) * 100}%`,
                        width: `${((buildingCloseMin - buildingOpenMin) / 1440) * 100}%`,
                      }}
                      className="absolute inset-y-0 bg-blue-50/70 dark:bg-blue-950/20 border-l border-r border-blue-200/60 dark:border-blue-800/40"
                      title={`Building working hours (${settings.buildingOpen}–${settings.buildingClose})`}
                    />

                    {/* Room scheduled window (light gray band) */}
                    <div
                      style={{
                        left: `${(roomSchedStartMin / 1440) * 100}%`,
                        width: `${((roomSchedEndMin - roomSchedStartMin) / 1440) * 100}%`,
                      }}
                      className="absolute inset-y-0 bg-slate-300/60 dark:bg-slate-600/50 border-l border-r border-slate-400/80"
                      title={`Room schedule (${currentRoom.scheduledStart}–${currentRoom.scheduledEnd})`}
                    />

                    {/* Actual Run Bar */}
                    {hasRun && (
                      <>
                        {/* Whole run interval with striped-amber base */}
                        <div
                          style={{
                            left: `${(runStart / 1440) * 100}%`,
                            width: `${((runEnd - runStart) / 1440) * 100}%`,
                          }}
                          className="absolute inset-y-1.5 striped-amber rounded-sm border border-amber-700"
                          title={`Actual run: ${record!.startTime}–${record!.endTime}`}
                        />

                        {/* Overlaid solid steel blue for portion that matches schedule */}
                        {hasNormalSegment && (
                          <div
                            style={{
                              left: `${(normalStart / 1440) * 100}%`,
                              width: `${((normalEnd - normalStart) / 1440) * 100}%`,
                            }}
                            className="absolute inset-y-1.5 bg-blue-600 dark:bg-blue-500 rounded-sm border border-blue-700"
                            title={`Scheduled run portion: ${minutesToTime(normalStart)}–${minutesToTime(
                              normalEnd
                            )}`}
                          />
                        )}
                      </>
                    )}

                    {/* Replay Vertical Marker */}
                    <div
                      style={{ left: `${(replayMinute / 1440) * 100}%` }}
                      className="absolute inset-y-0 w-0.5 bg-slate-900 dark:bg-slate-100 z-10 pointer-events-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend below explaining all four shades */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-sm"></span>
            <span>Building working hours ({settings.buildingOpen}–{settings.buildingClose})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 bg-slate-300 dark:bg-slate-600 border border-slate-400 rounded-sm"></span>
            <span>Room scheduled window</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 bg-blue-600 rounded-sm"></span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Running normally within schedule
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 striped-amber border border-amber-700 rounded-sm"></span>
            <span className="font-bold text-amber-800 dark:text-amber-400">
              Striped amber: Running outside schedule or hours
            </span>
          </div>
        </div>

        {/* 4. Replay the day controls */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-700 rounded space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 min-h-[40px]"
              >
                {isPlaying ? 'Pause replay' : 'Play the day'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setReplayMinute(9 * 60);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 underline hover:text-slate-900 dark:hover:text-slate-200 min-h-[40px]"
              >
                Reset to 09:00
              </button>
            </div>

            <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
              Simulated time: {minutesToTime(replayMinute)}
            </div>
          </div>

          {/* Time slider */}
          <div className="space-y-1">
            <label htmlFor="replay-slider" className="sr-only">
              Time of day replay slider
            </label>
            <input
              id="replay-slider"
              type="range"
              min={0}
              max={1440}
              step={10}
              value={replayMinute}
              onChange={(e) => {
                setIsPlaying(false);
                setReplayMinute(parseInt(e.target.value, 10));
              }}
              className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
            />
          </div>

          {/* Live device status list at the simulated marker */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Device status at {minutesToTime(replayMinute)}:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentRoom.equipment.map((eq) => {
                const status = getDeviceReplayStatus(eq.id, eq.powerKW);
                return (
                  <div
                    key={eq.id}
                    className={`p-2 rounded border text-xs flex items-center justify-between ${
                      status.isWaste
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold">{eq.name}:</span>
                    <span className={status.isWaste ? 'font-bold' : ''}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Detected events */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Detected events for {currentRoom.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit findings and calculations for {formatDateDisplay(selectedDate)}.
          </p>
        </div>

        {roomEvents.length === 0 ? (
          /* Short green confirmation when nothing is flagged */
          <div className="bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded p-6 text-center space-y-2">
            <div className="text-emerald-700 dark:text-emerald-400 font-bold text-base">
              No potential waste detected in {currentRoom.name} on {formatDateDisplay(selectedDate)}.
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All equipment operated strictly within scheduled room hours and building limits.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {roomEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4"
              >
                {/* Header: Name, Severity badge, Run times, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {ev.equipmentName}
                    </span>

                    {/* Text Severity Badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        ev.severity === 'High'
                          ? 'bg-amber-600 text-white'
                          : ev.severity === 'Medium'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {ev.severity} priority
                    </span>

                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Ran {ev.startTime}&ndash;{ev.endTime} (Scheduled: {ev.scheduledStart}&ndash;
                      {ev.scheduledEnd})
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`status-${ev.id}`}
                      className="text-xs font-medium text-slate-500 dark:text-slate-400"
                    >
                      Status:
                    </label>
                    <select
                      id={`status-${ev.id}`}
                      value={ev.status}
                      onChange={(e) => setEventStatus(ev.id, e.target.value as EventStatus)}
                      className="min-h-[36px] px-2.5 py-1 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="New">New</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Resolved">Resolved</option>
                      <option value="False alarm">False alarm</option>
                    </select>
                  </div>
                </div>

                {/* Plain sentence alert */}
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {ev.sentence}
                </p>

                {/* Why was this flagged section */}
                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 border border-slate-200 dark:border-slate-700 rounded space-y-2 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Why was this flagged?
                  </div>
                  <ul className="space-y-1.5 pl-3 list-disc text-slate-600 dark:text-slate-300">
                    {ev.triggeredRules.map((rule) => (
                      <li key={rule.id}>
                        <strong className="text-slate-900 dark:text-slate-100">{rule.name}:</strong>{' '}
                        {rule.description} &mdash; <em>{rule.numbers}</em>
                      </li>
                    ))}
                  </ul>

                  {/* Highlighted calculation line */}
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 font-mono text-xs text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2 rounded border border-amber-200 dark:border-amber-800">
                    <strong>Energy estimate calculation:</strong> {ev.calculationString}
                  </div>
                </div>

                {/* Footer details: repeat count & cost */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span>
                    Repeat frequency: Flagged on <strong>{ev.repeatCountIn7Days} of the last 7 days</strong>
                  </span>
                  <span>
                    Estimated cost impact:{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {formatCostDetailed(ev.estimatedCost, settings.currencySymbol)}
                    </strong>{' '}
                    ({ev.estimatedCO2Kg.toFixed(1)} kg CO₂)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
