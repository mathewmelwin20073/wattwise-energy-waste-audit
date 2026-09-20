import React, { useMemo, useState } from 'react';
import { useAudit } from '../context/AuditContext';
import { EventStatus, SeverityLevel, WasteEvent } from '../types';
import {
  formatCostDetailed,
  formatCurrency,
  formatDateDisplay,
  formatDurationHours,
  formatEnergy,
} from '../utils/detection';

export const WasteAuditView: React.FC = () => {
  const {
    allEvents,
    rooms,
    availableDates,
    settings,
    openRoom,
    setEventStatus,
    showToast,
  } = useAudit();

  // Filters state
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterRule, setFilterRule] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('energy-desc');

  const [copyConfirmed, setCopyConfirmed] = useState<boolean>(false);

  // Extract distinct floors
  const floors = useMemo(() => {
    return Array.from(new Set(rooms.map((r) => r.floor))).sort();
  }, [rooms]);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((ev) => {
        if (filterDate !== 'all' && ev.date !== filterDate) return false;
        if (filterFloor !== 'all' && ev.floor !== filterFloor) return false;
        if (filterRoom !== 'all' && ev.roomId !== filterRoom) return false;
        if (filterSeverity !== 'all' && ev.severity !== filterSeverity) return false;
        if (filterStatus !== 'all' && ev.status !== filterStatus) return false;
        if (filterRule !== 'all') {
          const hasRule = ev.triggeredRules.some((r) => r.id === filterRule);
          if (!hasRule) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'energy-desc') return b.avoidableEnergyKWh - a.avoidableEnergyKWh;
        if (sortBy === 'energy-asc') return a.avoidableEnergyKWh - b.avoidableEnergyKWh;
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
        if (sortBy === 'severity') {
          const weights: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
          return (weights[b.severity] || 0) - (weights[a.severity] || 0);
        }
        if (sortBy === 'room') return a.roomName.localeCompare(b.roomName);
        return 0;
      });
  }, [allEvents, filterDate, filterFloor, filterRoom, filterRule, filterSeverity, filterStatus, sortBy]);

  // Aggregates for filtered events
  const totalFilteredKWh = filteredEvents.reduce((acc, ev) => acc + ev.avoidableEnergyKWh, 0);
  const totalFilteredCost = totalFilteredKWh * settings.electricityTariff;
  const totalFilteredCO2 = totalFilteredKWh * settings.co2Factor;

  // Generate complete ready-made waste report text
  const reportText = useMemo(() => {
    const datesCovered =
      availableDates.length > 1
        ? `${availableDates[availableDates.length - 1]} to ${availableDates[0]}`
        : availableDates[0] || 'N/A';

    const highCount = allEvents.filter((e) => e.severity === 'High').length;
    const medCount = allEvents.filter((e) => e.severity === 'Medium').length;
    const lowCount = allEvents.filter((e) => e.severity === 'Low').length;

    const totalAllKWh = allEvents.reduce((a, b) => a + b.avoidableEnergyKWh, 0);
    const totalAllCost = totalAllKWh * settings.electricityTariff;
    const totalAllCO2 = totalAllKWh * settings.co2Factor;

    // Room breakdown
    const roomTotals: Record<string, number> = {};
    for (const ev of allEvents) {
      roomTotals[ev.roomName] = (roomTotals[ev.roomName] || 0) + ev.avoidableEnergyKWh;
    }
    const rankedRooms = Object.entries(roomTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, kwh], idx) => `${idx + 1}. ${name}: ${kwh.toFixed(1)} kWh (${formatCurrency(kwh * settings.electricityTariff, settings.currencySymbol)})`)
      .join('\n');

    // Recurring equipment
    const repeatEvents = allEvents.filter((e) => e.repeatCountIn7Days >= 3);
    const uniqueRepeats = Array.from(
      new Set(repeatEvents.map((e) => `${e.roomName} - ${e.equipmentName} (${e.repeatCountIn7Days} of 7 days)`))
    ).join('\n');

    return `ENERGY WASTE AUDIT REPORT
========================================
Audit Period: ${datesCovered}
Rooms Monitored: ${rooms.length} rooms (${rooms.map((r) => r.name).join(', ')})
Building Standard Hours: ${settings.buildingOpen} - ${settings.buildingClose}
Tariff: ${settings.currencySymbol}${settings.electricityTariff.toFixed(2)}/kWh

KEY FINDINGS & METRICS
----------------------------------------
Total Detected Waste Events: ${allEvents.length}
- High priority events: ${highCount}
- Medium priority events: ${medCount}
- Low priority events: ${lowCount}

Total Avoidable Energy: ${totalAllKWh.toFixed(1)} kWh
Estimated Financial Waste: ${formatCurrency(totalAllCost, settings.currencySymbol)}
Estimated Avoidable Emissions: ${totalAllCO2.toFixed(1)} kg CO₂

ROOMS RANKED BY AVOIDABLE WASTE
----------------------------------------
${rankedRooms || 'No room waste recorded.'}

RECURRING ISSUES (Flagged 3+ days)
----------------------------------------
${uniqueRepeats || 'No recurring equipment issues flagged.'}

ACTION PLAN
----------------------------------------
1. Verify shutdown procedures in highest ranked rooms.
2. Automate equipment timers or appoint designated room monitors for late-running units.
3. Review building closing grace periods.

NOTE
----------------------------------------
All figures are estimates based on the entered schedules, power ratings and run times.
Generated on: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;
  }, [allEvents, availableDates, rooms, settings]);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopyConfirmed(true);
      showToast('Copied to clipboard.', 'success');
      setTimeout(() => setCopyConfirmed(false), 3000);
    } catch {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  const resetAllFilters = () => {
    setFilterDate('all');
    setFilterFloor('all');
    setFilterRoom('all');
    setFilterRule('all');
    setFilterSeverity('all');
    setFilterStatus('all');
    setSortBy('energy-desc');
  };

  return (
    <div className="space-y-8">
      {/* 1. Filter Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Audit filter controls
          </h3>
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 underline hover:text-slate-900 dark:hover:text-slate-200"
          >
            Reset all filters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
          {/* Day */}
          <div>
            <label htmlFor="filter-day" className="block font-medium text-slate-500 dark:text-slate-400 mb-1">
              Day
            </label>
            <select
              id="filter-day"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full min-h-[40px] px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All days</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {formatDateDisplay(d)}
                </option>
              ))}
            </select>
          </div>

          {/* Floor */}
          <div>
            <label htmlFor="filter-floor" className="block font-medium text-slate-500 dark:text-slate-400 mb-1">
              Floor
            </label>
            <select
              id="filter-floor"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="w-full min-h-[40px] px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All floors</option>
              {floors.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div>
            <label htmlFor="filter-room" className="block font-medium text-slate-500 dark:text-slate-400 mb-1">
              Room
            </label>
            <select
              id="filter-room"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full min-h-[40px] px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rule */}
          <div>
            <label htmlFor="filter-rule" className="block font-medium text-slate-500 dark:text-slate-400 mb-1">
              Rule
            </label>
            <select
              id="filter-rule"
              value={filterRule}
              onChange={(e) => setFilterRule(e.target.value)}
              className="w-full min-h-[40px] px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All rules</option>
              <option value="rule_1_beyond_schedule">Rule 1: Beyond schedule</option>
              <option value="rule_2_after_hours">Rule 2: After hours</option>
              <option value="rule_3_excessive_operation">Rule 3: Excessive operation</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label htmlFor="filter-severity" className="block font-medium text-slate-500 dark:text-slate-400 mb-1">
              Severity
            </label>
            <select
              id="filter-severity"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full min-h-[40px] px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All severities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="filter-status" className="block font-medium text-slate-500 dark:text-slate-400 mb-1">
              Status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full min-h-[40px] px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All statuses</option>
              <option value="New">New</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
              <option value="False alarm">False alarm</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="sort-by" className="block font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sort by
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full min-h-[40px] px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold"
            >
              <option value="energy-desc">Energy (High to Low)</option>
              <option value="energy-asc">Energy (Low to High)</option>
              <option value="date-desc">Date (Newest first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="severity">Severity priority</option>
              <option value="room">Room name</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Result summary */}
      <div className="bg-slate-50 dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100 font-medium">
        <strong>{filteredEvents.length} events</strong> showing about{' '}
        <strong>{totalFilteredKWh.toFixed(1)} kWh</strong> of potentially avoidable energy, an
        estimated cost of <strong>{formatCurrency(totalFilteredCost, settings.currencySymbol)}</strong>{' '}
        (approx. {totalFilteredCO2.toFixed(1)} kg CO₂).
      </div>

      {/* 3. Table or No-results message */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No waste events matched the selected filters.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set a filter back to &ldquo;All&rdquo; or reset filters above to see recorded events.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[40px]"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4 font-bold">Severity</th>
                  <th className="py-3 px-4 font-bold">Day</th>
                  <th className="py-3 px-4 font-bold">Room</th>
                  <th className="py-3 px-4 font-bold">Equipment</th>
                  <th className="py-3 px-4 font-bold">Rules triggered</th>
                  <th className="py-3 px-4 text-right font-bold">Avoidable time</th>
                  <th className="py-3 px-4 text-right font-bold">Energy</th>
                  <th className="py-3 px-4 text-center font-bold">Repeats</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                    {/* Severity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          ev.severity === 'High'
                            ? 'bg-amber-600 text-white'
                            : ev.severity === 'Medium'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ev.severity}
                      </span>
                    </td>

                    {/* Day */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                      {formatDateDisplay(ev.date)}
                    </td>

                    {/* Room */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{ev.roomName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{ev.floor}</div>
                    </td>

                    {/* Equipment */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {ev.equipmentName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ev.powerKW.toFixed(2)} kW
                      </div>
                    </td>

                    {/* Rules */}
                    <td className="py-3 px-4 max-w-xs">
                      <ul className="space-y-0.5">
                        {ev.triggeredRules.map((r) => (
                          <li key={r.id} className="text-[11px] text-slate-700 dark:text-slate-300">
                            &bull; {r.name.replace('Rule ', 'R')}
                          </li>
                        ))}
                      </ul>
                    </td>

                    {/* Avoidable Time */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-800 dark:text-slate-200">
                      {formatDurationHours(ev.avoidableHours)}
                    </td>

                    {/* Energy */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                      {formatEnergy(ev.avoidableEnergyKWh)}
                    </td>

                    {/* Repeats */}
                    <td className="py-3 px-4 text-center whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {ev.repeatCountIn7Days} of 7 days
                    </td>

                    {/* Status dropdown */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        aria-label={`Status for event ${ev.id}`}
                        value={ev.status}
                        onChange={(e) => setEventStatus(ev.id, e.target.value as EventStatus)}
                        className="text-xs font-bold px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[36px]"
                      >
                        <option value="New">New</option>
                        <option value="Investigating">Investigating</option>
                        <option value="Resolved">Resolved</option>
                        <option value="False alarm">False alarm</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openRoom(ev.roomId, ev.date)}
                        className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 min-h-[36px]"
                      >
                        Open room
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Waste report */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ready-made waste report
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Summary document ready to copy directly into emails, management briefings, or audits.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyReport}
            className={`px-4 py-2 text-xs font-bold rounded border min-h-[40px] transition-colors ${
              copyConfirmed
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                : 'border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800'
            }`}
          >
            {copyConfirmed ? 'Copied to clipboard.' : 'Copy report'}
          </button>
        </div>

        <div>
          <label htmlFor="report-textarea" className="sr-only">
            Generated waste report text
          </label>
          <textarea
            id="report-textarea"
            readOnly
            rows={14}
            value={reportText}
            className="w-full font-mono text-xs p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
