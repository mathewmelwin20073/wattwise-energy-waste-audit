import React, { useMemo, useState } from 'react';
import { useAudit } from '../context/AuditContext';
import {
  formatCostDetailed,
  formatCurrency,
  formatDateDisplay,
  formatEnergy,
  generateHeatmapData,
} from '../utils/detection';

export const DashboardView: React.FC = () => {
  const {
    dashboardPeriod,
    setDashboardPeriod,
    rooms,
    records,
    settings,
    latestDayEvents,
    last7DaysEvents,
    availableDates,
    openRoom,
  } = useAudit();

  const [hoveredCell, setHoveredCell] = useState<{
    roomName: string;
    hour: number;
    kwh: number;
  } | null>(null);

  // Active records based on period
  const activeRecords = useMemo(() => {
    if (dashboardPeriod === 'latest') {
      const latestDate = availableDates[0] || '';
      return records.filter((r) => r.date === latestDate);
    }
    const dates7 = availableDates.slice(0, 7);
    return records.filter((r) => dates7.includes(r.date));
  }, [dashboardPeriod, records, availableDates]);

  // Active events based on period
  const activeEvents = dashboardPeriod === 'latest' ? latestDayEvents : last7DaysEvents;

  // Heatmap generation
  const heatmapData = useMemo(() => {
    return generateHeatmapData(rooms, activeRecords, settings);
  }, [rooms, activeRecords, settings]);

  // Key metrics calculation
  const totalAvoidableKWh = useMemo(() => {
    return activeEvents.reduce((acc, ev) => acc + ev.avoidableEnergyKWh, 0);
  }, [activeEvents]);

  const totalCost = totalAvoidableKWh * settings.electricityTariff;
  const totalCO2Kg = totalAvoidableKWh * settings.co2Factor;

  const totalEventsCount = activeEvents.length;
  const highPriorityCount = activeEvents.filter((ev) => ev.severity === 'High').length;

  const flaggedRoomIds = useMemo(() => {
    return new Set(activeEvents.map((ev) => ev.roomId));
  }, [activeEvents]);

  const flaggedRoomsCount = flaggedRoomIds.size;
  const totalRoomsCount = rooms.length;

  // Headline statement
  const headlineSentence = useMemo(() => {
    if (flaggedRoomsCount === 0 || totalAvoidableKWh === 0) {
      return 'No significant avoidable energy waste detected during this period.';
    }
    const worst = heatmapData.worstRoom;
    const worstKWh = heatmapData.rows[0]?.totalKWh || 0;
    const peakHourStr = `${heatmapData.peakHour.toString().padStart(2, '0')}:00`;

    if (worst && worstKWh > 0) {
      return `${worst.name} has the most avoidable energy (${formatEnergy(
        worstKWh
      )}), and waste peaks at ${peakHourStr} (${formatEnergy(heatmapData.peakHourKWh)}).`;
    }
    return `Waste peaks across the building at ${peakHourStr} (${formatEnergy(
      heatmapData.peakHourKWh
    )}).`;
  }, [flaggedRoomsCount, totalAvoidableKWh, heatmapData]);

  // Top 5 serious events
  const topEvents = useMemo(() => {
    return activeEvents.slice(0, 5);
  }, [activeEvents]);

  // Keeps happening list: equipment flagged on 3 or more of the last 7 days
  const recurringEquipment = useMemo(() => {
    const dates7 = availableDates.slice(0, 7);
    const recs7 = records.filter((r) => dates7.includes(r.date));
    const countMap: Record<
      string,
      { roomId: string; roomName: string; equipmentName: string; count: number }
    > = {};

    for (const room of rooms) {
      const schedDur =
        (parseInt(room.scheduledEnd) - parseInt(room.scheduledStart)) * 60 || 60;
      for (const eq of room.equipment) {
        const key = `${room.id}_${eq.id}`;
        let flaggedDays = 0;

        for (const d of dates7) {
          const rec = recs7.find(
            (r) => r.roomId === room.id && r.equipmentId === eq.id && r.date === d
          );
          if (rec && rec.startTime && rec.endTime) {
            // Did it overrun schedule by > grace?
            const [sh, sm] = rec.startTime.split(':').map(Number);
            const [eh, em] = rec.endTime.split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            if (dur > schedDur + settings.gracePeriodMinutes) {
              flaggedDays++;
            }
          }
        }

        if (flaggedDays >= 3) {
          countMap[key] = {
            roomId: room.id,
            roomName: room.name,
            equipmentName: eq.name,
            count: flaggedDays,
          };
        }
      }
    }

    return Object.values(countMap).sort((a, b) => b.count - a.count);
  }, [rooms, records, availableDates, settings.gracePeriodMinutes]);

  // Helper for amber heat color
  const getHeatmapColorClass = (kwh: number) => {
    if (kwh === 0) return 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700';
    if (kwh < 0.5) return 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800';
    if (kwh < 1.5) return 'bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700';
    if (kwh < 3.0) return 'bg-amber-400 text-slate-950 font-bold border border-amber-500';
    return 'bg-amber-600 text-white font-bold border border-amber-700';
  };

  return (
    <div className="space-y-8">
      {/* 1. Headline answer & Period switch */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pt-2">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Energy waste diagnosis
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {headlineSentence}
          </h2>
        </div>

        {/* Period switch */}
        <div
          role="group"
          aria-label="Audit period"
          className="inline-flex self-start border border-slate-300 dark:border-slate-700 rounded overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setDashboardPeriod('latest')}
            className={`px-4 py-2 text-sm font-medium transition-colors min-h-[40px] ${
              dashboardPeriod === 'latest'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Latest day
          </button>
          <button
            type="button"
            onClick={() => setDashboardPeriod('7days')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-300 dark:border-slate-700 min-h-[40px] ${
              dashboardPeriod === '7days'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Last 7 days
          </button>
        </div>
      </div>

      {/* 2. Key figures row */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700">
          {/* Avoidable energy */}
          <div className="p-5">
            <div className="text-xs uppercase font-medium tracking-wider text-slate-500 dark:text-slate-400">
              Avoidable energy
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatEnergy(totalAvoidableKWh)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Estimated unnecessary operation
            </div>
          </div>

          {/* Estimated cost & CO2 */}
          <div className="p-5">
            <div className="text-xs uppercase font-medium tracking-wider text-slate-500 dark:text-slate-400">
              Estimated cost
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalCost, settings.currencySymbol)}
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
              About {totalCO2Kg.toFixed(1)} kg avoidable CO₂
            </div>
          </div>

          {/* Waste events */}
          <div className="p-5">
            <div className="text-xs uppercase font-medium tracking-wider text-slate-500 dark:text-slate-400">
              Detected waste events
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {totalEventsCount}
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {highPriorityCount > 0 ? (
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {highPriorityCount} high priority
                </span>
              ) : (
                '0 high priority'
              )}
            </div>
          </div>

          {/* Flagged rooms */}
          <div className="p-5">
            <div className="text-xs uppercase font-medium tracking-wider text-slate-500 dark:text-slate-400">
              Rooms flagged
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {flaggedRoomsCount} / {totalRoomsCount}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {flaggedRoomsCount === 0
                ? 'All rooms within parameters'
                : `${totalRoomsCount - flaggedRoomsCount} rooms running within schedule`}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Heatmap (the visual centerpiece) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Hourly avoidable waste heatmap
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rooms ordered from worst to best. Columns represent hour of the day (00:00 to 23:00).
            </p>
          </div>

          {/* Color scale legend */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span>0 kWh</span>
            <span className="inline-block w-4 h-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm"></span>
            <span className="inline-block w-4 h-4 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-sm"></span>
            <span className="inline-block w-4 h-4 bg-amber-200 dark:bg-amber-900/80 border border-amber-300 dark:border-amber-700 rounded-sm"></span>
            <span className="inline-block w-4 h-4 bg-amber-400 border border-amber-500 rounded-sm"></span>
            <span className="inline-block w-4 h-4 bg-amber-600 border border-amber-700 rounded-sm"></span>
            <span>&gt; 3.0 kWh</span>
          </div>
        </div>

        {/* Heatmap table container with horizontal scroll */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300 w-32">
                  Room
                </th>
                {Array.from({ length: 24 }).map((_, h) => (
                  <th
                    key={h}
                    className="py-2 px-0.5 text-center font-normal text-slate-500 dark:text-slate-400 w-6"
                  >
                    {h.toString().padStart(2, '0')}
                  </th>
                ))}
                <th className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300 w-24">
                  Total
                </th>
                <th className="py-2 px-3 text-center font-bold text-slate-700 dark:text-slate-300 w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {heatmapData.rows.map(({ room, hourlyKWh, totalKWh }) => (
                <tr key={room.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <div>{room.name}</div>
                    <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      {room.floor}
                    </div>
                  </td>
                  {hourlyKWh.map((val, h) => (
                    <td
                      key={h}
                      onMouseEnter={() =>
                        setHoveredCell({ roomName: room.name, hour: h, kwh: val })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className="py-1 px-0.5 text-center"
                    >
                      <div
                        className={`w-5 h-7 mx-auto rounded-sm flex items-center justify-center transition-colors cursor-pointer ${getHeatmapColorClass(
                          val
                        )}`}
                        title={`${room.name} at ${h.toString().padStart(2, '0')}:00: ${val.toFixed(
                          1
                        )} kWh avoidable`}
                      >
                        {val > 0.5 ? val.toFixed(0) : ''}
                      </div>
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatEnergy(totalKWh)}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openRoom(room.id)}
                      className="px-2.5 py-1 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      Open room
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Active cell hover inspector info */}
        <div className="min-h-[24px] text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
          {hoveredCell ? (
            <span>
              Inspecting: <strong className="text-slate-900 dark:text-slate-100">{hoveredCell.roomName}</strong> at{' '}
              <strong>{hoveredCell.hour.toString().padStart(2, '0')}:00</strong> &mdash;{' '}
              <strong className="text-amber-700 dark:text-amber-400">
                {hoveredCell.kwh.toFixed(2)} kWh
              </strong>{' '}
              potentially avoidable energy.
            </span>
          ) : (
            <span>Hover any heatmap cell to view exact hour and avoidable energy details.</span>
          )}
        </div>
      </div>

      {/* 4. Bottom Grid: Needs attention & Keeps happening */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs attention (Top 5 events) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Needs attention
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The five most serious detected waste events requiring management action.
            </p>
          </div>

          {topEvents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              No unresolved waste events detected for this period.
            </p>
          ) : (
            <ol className="divide-y divide-slate-100 dark:divide-slate-800">
              {topEvents.map((ev, index) => (
                <li key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4">
                        {index + 1}.
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
                        {formatDateDisplay(ev.date)} &bull; {ev.roomName} ({ev.floor})
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 pl-6">
                      {ev.sentence}
                    </p>

                    <div className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                      Ran {ev.startTime}&ndash;{ev.endTime} (scheduled {ev.scheduledStart}&ndash;
                      {ev.scheduledEnd}) &bull; Status:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">{ev.status}</span>
                    </div>
                  </div>

                  <div className="sm:self-center pl-6 sm:pl-0">
                    <button
                      type="button"
                      onClick={() => openRoom(ev.roomId, ev.date)}
                      className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 whitespace-nowrap min-h-[40px]"
                    >
                      Open room
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Keeps happening */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Keeps happening
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Equipment flagged on three or more of the last seven days.
            </p>
          </div>

          {recurringEquipment.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              No recurring issues detected across 3 or more days.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recurringEquipment.map((item) => (
                <li key={`${item.roomId}_${item.equipmentName}`} className="py-3 space-y-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.roomName}, {item.equipmentName}
                  </div>
                  <div className="text-xs text-amber-800 dark:text-amber-400 font-bold">
                    Flagged on {item.count} of the last 7 days.
                  </div>
                  <button
                    type="button"
                    onClick={() => openRoom(item.roomId)}
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 underline hover:text-slate-900 dark:hover:text-white"
                  >
                    Investigate {item.roomName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
