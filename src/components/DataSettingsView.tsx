import React, { useState } from 'react';
import { useAudit } from '../context/AuditContext';
import { BuildingSettings } from '../types';
import { formatDateDisplay } from '../utils/detection';

export const DataSettingsView: React.FC = () => {
  const {
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
    resetToDemo,
    clearAllData,
    toast,
    showToast,
    theme,
    setTheme,
  } = useAudit();

  // Local settings form state
  const [localSettings, setLocalSettings] = useState<BuildingSettings>(settings);

  // New room form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('Floor 1');
  const [newRoomStart, setNewRoomStart] = useState('09:00');
  const [newRoomEnd, setNewRoomEnd] = useState('17:00');
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);

  // New equipment form states: mapping roomId -> { name, powerKW, isOpen }
  const [addingEqRoomId, setAddingEqRoomId] = useState<string | null>(null);
  const [newEqName, setNewEqName] = useState('');
  const [newEqPower, setNewEqPower] = useState('1.5');

  // When equipment actually ran tab state
  const [logDate, setLogDate] = useState<string>(availableDates[0] || '2026-09-18');
  const [newDayDate, setNewDayDate] = useState<string>('');

  // Two-click reset safety states
  const [resetPending, setResetPending] = useState(false);
  const [clearPending, setClearPending] = useState(false);

  // Handle saving rules and costs
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSettings.buildingClose <= localSettings.buildingOpen) {
      showToast('The building closing time must be after the opening time.', 'error');
      return;
    }
    if (localSettings.gracePeriodMinutes < 0) {
      showToast('Grace period cannot be negative.', 'error');
      return;
    }
    if (localSettings.excessiveMultiplier <= 1.0) {
      showToast('Excessive operation multiplier should be greater than 1.0.', 'error');
      return;
    }
    updateSettings(localSettings);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const success = addRoom(newRoomName, newRoomFloor, newRoomStart, newRoomEnd);
    if (success) {
      setNewRoomName('');
      setShowAddRoomForm(false);
    }
  };

  const handleCreateEquipment = (roomId: string, e: React.FormEvent) => {
    e.preventDefault();
    const power = parseFloat(newEqPower);
    const success = addEquipment(roomId, newEqName, power);
    if (success) {
      setNewEqName('');
      setNewEqPower('1.5');
      setAddingEqRoomId(null);
    }
  };

  const handleAddDaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDayDate) {
      const success = addDay(newDayDate);
      if (success) {
        setLogDate(newDayDate);
        setNewDayDate('');
      }
    }
  };

  return (
    <div className="space-y-10">
      {/* Top Message Line */}
      <div className="min-h-[44px] flex items-center">
        {toast ? (
          <div
            className={`w-full px-4 py-2.5 rounded text-sm font-bold border transition-all ${
              toast.type === 'error'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-950 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
            }`}
            role="status"
          >
            {toast.text}
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            All modifications update audit evaluations and reports instantly upon saving.
          </div>
        )}
      </div>

      {/* 1. Rules and costs */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            1. Audit rules and energy costs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Parameters controlling building hours, schedule overrun allowances, severity tiers, and
            cost calculations.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            {/* Opening time */}
            <div>
              <label htmlFor="setting-open" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Building opening time
              </label>
              <input
                id="setting-open"
                type="time"
                value={localSettings.buildingOpen}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, buildingOpen: e.target.value })
                }
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Start of standard building operations.
              </span>
            </div>

            {/* Closing time */}
            <div>
              <label htmlFor="setting-close" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Building closing time
              </label>
              <input
                id="setting-close"
                type="time"
                value={localSettings.buildingClose}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, buildingClose: e.target.value })
                }
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Runs past this are flagged under Rule 2.
              </span>
            </div>

            {/* Grace period */}
            <div>
              <label htmlFor="setting-grace" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Grace period (minutes)
              </label>
              <input
                id="setting-grace"
                type="number"
                min={0}
                max={120}
                value={localSettings.gracePeriodMinutes}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    gracePeriodMinutes: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Acceptable overrun before flagging waste.
              </span>
            </div>

            {/* Excessive multiplier */}
            <div>
              <label htmlFor="setting-excessive" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Excessive duration multiplier
              </label>
              <input
                id="setting-excessive"
                type="number"
                step="0.1"
                min={1.1}
                max={5.0}
                value={localSettings.excessiveMultiplier}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    excessiveMultiplier: parseFloat(e.target.value) || 1.5,
                  })
                }
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Triggers Rule 3 if actual &gt; (multiplier &times; sched).
              </span>
            </div>

            {/* Medium severity threshold */}
            <div>
              <label htmlFor="setting-med-thresh" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Medium priority threshold (kWh)
              </label>
              <input
                id="setting-med-thresh"
                type="number"
                step="0.5"
                min={0.1}
                value={localSettings.mediumSeverityThresholdKW}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    mediumSeverityThresholdKW: parseFloat(e.target.value) || 2.0,
                  })
                }
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Avoidable energy for Medium severity.
              </span>
            </div>

            {/* High severity threshold */}
            <div>
              <label htmlFor="setting-high-thresh" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                High priority threshold (kWh)
              </label>
              <input
                id="setting-high-thresh"
                type="number"
                step="0.5"
                min={0.5}
                value={localSettings.highSeverityThresholdKW}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    highSeverityThresholdKW: parseFloat(e.target.value) || 5.0,
                  })
                }
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Avoidable energy for High severity.
              </span>
            </div>

            {/* Tariff */}
            <div>
              <label htmlFor="setting-tariff" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Electricity tariff rate (per kWh)
              </label>
              <input
                id="setting-tariff"
                type="number"
                step="0.1"
                min={0.01}
                value={localSettings.electricityTariff}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    electricityTariff: parseFloat(e.target.value) || 8.0,
                  })
                }
                className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Utility billing cost factor.
              </span>
            </div>

            {/* Currency symbol & CO2 factor */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="setting-curr" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Currency symbol
                </label>
                <input
                  id="setting-curr"
                  type="text"
                  maxLength={3}
                  value={localSettings.currencySymbol}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, currencySymbol: e.target.value })
                  }
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="setting-co2" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  CO₂ factor (kg/kWh)
                </label>
                <input
                  id="setting-co2"
                  type="number"
                  step="0.01"
                  min={0.01}
                  value={localSettings.co2Factor}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      co2Factor: parseFloat(e.target.value) || 0.82,
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 min-h-[40px]"
            >
              Save rules and settings
            </button>
          </div>
        </form>
      </section>

      {/* 2. Rooms and equipment */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              2. Rooms and equipment inventory
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set expected operating windows and equipment power ratings (in kW).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddRoomForm(!showAddRoomForm)}
            className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 min-h-[40px]"
          >
            {showAddRoomForm ? 'Cancel adding room' : 'Add room'}
          </button>
        </div>

        {/* Add room form modal/card */}
        {showAddRoomForm && (
          <form
            onSubmit={handleCreateRoom}
            className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Add new room
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Room name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 301"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Floor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Floor 3"
                  value={newRoomFloor}
                  onChange={(e) => setNewRoomFloor(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled start
                </label>
                <input
                  type="time"
                  required
                  value={newRoomStart}
                  onChange={(e) => setNewRoomStart(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled end
                </label>
                <input
                  type="time"
                  required
                  value={newRoomEnd}
                  onChange={(e) => setNewRoomEnd(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRoomForm(false)}
                className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 min-h-[40px]"
              >
                Save new room
              </button>
            </div>
          </form>
        )}

        {/* Room panels list */}
        <div className="space-y-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-4"
            >
              {/* Room Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {room.name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {room.floor} &bull; Scheduled operating window:{' '}
                    <strong>
                      {room.scheduledStart} to {room.scheduledEnd}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeRoom(room.id)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[40px]"
                  >
                    Remove room
                  </button>
                </div>
              </div>

              {/* Equipment Rows */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Installed electrical equipment
                </div>

                {room.equipment.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No equipment listed for this room.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    {room.equipment.map((eq) => (
                      <div
                        key={eq.id}
                        className="px-3.5 py-2.5 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-850/50"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {eq.name}
                          </span>
                          <span className="ml-3 font-mono text-slate-600 dark:text-slate-400">
                            {eq.powerKW.toFixed(2)} kW
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeEquipment(room.id, eq.id)}
                          className="text-xs text-slate-600 dark:text-slate-400 underline hover:text-slate-900 dark:hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Equipment Sub-form */}
              {addingEqRoomId === room.id ? (
                <form
                  onSubmit={(e) => handleCreateEquipment(room.id, e)}
                  className="bg-slate-50 dark:bg-slate-850 p-3 rounded border border-slate-300 dark:border-slate-600 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Equipment name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Split AC unit"
                        required
                        value={newEqName}
                        onChange={(e) => setNewEqName(e.target.value)}
                        className="w-full min-h-[38px] px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Power rating (kW)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        required
                        value={newEqPower}
                        onChange={(e) => setNewEqPower(e.target.value)}
                        className="w-full min-h-[38px] px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAddingEqRoomId(null)}
                      className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 min-h-[36px]"
                    >
                      Add equipment
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingEqRoomId(room.id);
                      setNewEqName('');
                      setNewEqPower('1.5');
                    }}
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 underline hover:text-slate-900 dark:hover:text-white"
                  >
                    + Add equipment to {room.name}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. When equipment actually ran */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              3. When equipment actually ran
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter operating switch-on and switch-off times for each day. Leave both blank if it did
              not run.
            </p>
          </div>

          {/* Add another day form */}
          <form onSubmit={handleAddDaySubmit} className="flex items-center gap-2">
            <label htmlFor="new-day-input" className="sr-only">
              Add another day date
            </label>
            <input
              id="new-day-input"
              type="date"
              value={newDayDate}
              onChange={(e) => setNewDayDate(e.target.value)}
              className="min-h-[40px] px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 min-h-[40px] whitespace-nowrap"
            >
              Add day
            </button>
          </form>
        </div>

        {/* Day selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="log-day-select" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Select logging day:
          </label>
          <select
            id="log-day-select"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="min-h-[40px] px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {formatDateDisplay(d)} ({d})
              </option>
            ))}
          </select>
        </div>

        {/* Operating log table for all equipment across rooms */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4 font-bold">Room</th>
                <th className="py-3 px-4 font-bold">Equipment & Power</th>
                <th className="py-3 px-4 font-bold">Room Schedule</th>
                <th className="py-3 px-4 font-bold">Switched on (HH:MM)</th>
                <th className="py-3 px-4 font-bold">Switched off (HH:MM)</th>
                <th className="py-3 px-4 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {rooms.map((room) =>
                room.equipment.map((eq) => {
                  const record = records.find(
                    (r) => r.roomId === room.id && r.equipmentId === eq.id && r.date === logDate
                  );
                  const startVal = record?.startTime || '';
                  const endVal = record?.endTime || '';

                  return (
                    <tr key={`${room.id}_${eq.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                        {room.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{eq.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {eq.powerKW.toFixed(2)} kW
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {room.scheduledStart} &ndash; {room.scheduledEnd}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <input
                          type="time"
                          value={startVal}
                          onChange={(e) =>
                            updateEquipmentRun(room.id, eq.id, logDate, e.target.value, endVal)
                          }
                          className="min-h-[38px] px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <input
                          type="time"
                          value={endVal}
                          onChange={(e) =>
                            updateEquipmentRun(room.id, eq.id, logDate, startVal, e.target.value)
                          }
                          className="min-h-[38px] px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => clearEquipmentRun(room.id, eq.id, logDate)}
                          className="px-2.5 py-1 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[36px]"
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Appearance & Theme Mode */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6 space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            4. Portal appearance and display theme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose whether to display the portal in clean light mode, high-contrast dark mode, or
            automatically synchronize with your device operating system setting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            id="theme-opt-light"
            onClick={() => setTheme('light')}
            className={`text-left p-4 rounded border transition-all ${
              theme === 'light'
                ? 'border-slate-900 dark:border-slate-100 ring-2 ring-slate-900 dark:ring-slate-100 bg-slate-50 dark:bg-slate-700/50'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Light mode</span>
              {theme === 'light' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pale cool gray-blue background with crisp white panels and deep slate text.
            </p>
          </button>

          <button
            type="button"
            id="theme-opt-dark"
            onClick={() => setTheme('dark')}
            className={`text-left p-4 rounded border transition-all ${
              theme === 'dark'
                ? 'border-slate-900 dark:border-slate-100 ring-2 ring-slate-900 dark:ring-slate-100 bg-slate-50 dark:bg-slate-700/50'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Dark mode</span>
              {theme === 'dark' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deep slate canvas with soft borders and highlighted amber waste metrics.
            </p>
          </button>

          <button
            type="button"
            id="theme-opt-system"
            onClick={() => setTheme('system')}
            className={`text-left p-4 rounded border transition-all ${
              theme === 'system'
                ? 'border-slate-900 dark:border-slate-100 ring-2 ring-slate-900 dark:ring-slate-100 bg-slate-50 dark:bg-slate-700/50'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Device theme</span>
              {theme === 'system' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatically follows your browser or operating system day/night appearance.
            </p>
          </button>
        </div>
      </section>

      {/* 5. Reset & Safety Controls */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6 space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            5. System reset and demo controls
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quickly restore proposal demo records or clear data for fresh manual entry. Each requires
            a second click to confirm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          {/* Reset to demo */}
          <button
            type="button"
            onClick={() => {
              if (resetPending) {
                resetToDemo();
                setResetPending(false);
              } else {
                setResetPending(true);
                setTimeout(() => setResetPending(false), 5000);
              }
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded border min-h-[40px] transition-colors ${
              resetPending
                ? 'bg-amber-600 text-white border-amber-700'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100'
            }`}
          >
            {resetPending ? 'Click again to reset to demo data' : 'Reset to demo data'}
          </button>

          {/* Clear all data */}
          <button
            type="button"
            onClick={() => {
              if (clearPending) {
                clearAllData();
                setClearPending(false);
              } else {
                setClearPending(true);
                setTimeout(() => setClearPending(false), 5000);
              }
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded border min-h-[40px] transition-colors ${
              clearPending
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {clearPending ? 'Click again to clear all data' : 'Clear all data'}
          </button>
        </div>
      </section>
    </div>
  );
};
