import React, { useMemo, useState } from 'react';
import { useAudit } from '../context/AuditContext';
import { WhatIfParameters } from '../types';
import { formatCurrency, formatEnergy } from '../utils/detection';

export const WhatIfSimulatorView: React.FC = () => {
  const { settings, allEvents, rooms } = useAudit();

  // Initial proposal example from specification:
  // "For example, suppose 10 rooms each have an estimated unnecessary AC operation of 2 kW for 1 hour per day.
  // Potential daily saving: 10 × 2 × 1 = 20 kWh/day. For 30 days: 20 × 30 = 600 kWh/month."
  const PROPOSAL_EXAMPLE: WhatIfParameters = {
    roomCount: 10,
    powerKWPerRoom: 2.0,
    unnecessaryHoursPerDay: 1.0,
    daysPerMonth: 30,
    shutdownPracticeReductionPct: 25,
  };

  const [params, setParams] = useState<WhatIfParameters>(PROPOSAL_EXAMPLE);

  const resetToProposal = () => {
    setParams(PROPOSAL_EXAMPLE);
  };

  const useDetectedWaste = () => {
    if (allEvents.length === 0) {
      setParams(PROPOSAL_EXAMPLE);
      return;
    }

    const uniqueRooms = new Set(allEvents.map((e) => e.roomId)).size || rooms.length;
    const avgPower =
      allEvents.reduce((acc, e) => acc + e.powerKW, 0) / allEvents.length || 2.0;
    const avgHours =
      allEvents.reduce((acc, e) => acc + e.avoidableHours, 0) / allEvents.length || 1.5;

    setParams({
      roomCount: uniqueRooms,
      powerKWPerRoom: Number(avgPower.toFixed(2)),
      unnecessaryHoursPerDay: Number(avgHours.toFixed(1)),
      daysPerMonth: 30,
      shutdownPracticeReductionPct: 35,
    });
  };

  // Math working
  const dailyKWh = params.roomCount * params.powerKWPerRoom * params.unnecessaryHoursPerDay;
  const monthlyKWh = dailyKWh * params.daysPerMonth;
  const yearlyKWh = monthlyKWh * 12;

  const monthlyCost = monthlyKWh * settings.electricityTariff;
  const yearlyCost = yearlyKWh * settings.electricityTariff;

  const monthlyCO2 = monthlyKWh * settings.co2Factor;
  const yearlyCO2 = yearlyKWh * settings.co2Factor;

  // Scenarios
  const scenarios = useMemo(() => {
    const calc = (label: string, remainingHours: number, pctReduction?: number) => {
      let remMonthlyKWh = 0;
      if (pctReduction !== undefined) {
        remMonthlyKWh = monthlyKWh * (1 - pctReduction / 100);
      } else {
        const dKWh = params.roomCount * params.powerKWPerRoom * remainingHours;
        remMonthlyKWh = dKWh * params.daysPerMonth;
      }

      const savedKWh = Math.max(0, monthlyKWh - remMonthlyKWh);
      const savedCost = savedKWh * settings.electricityTariff;
      const barPct = monthlyKWh > 0 ? (remMonthlyKWh / monthlyKWh) * 100 : 0;

      return {
        label,
        remainingKWh: remMonthlyKWh,
        savedKWh,
        savedCost,
        barPct: Math.min(100, Math.max(0, barPct)),
      };
    };

    return [
      calc('Current operation', params.unnecessaryHoursPerDay),
      calc(
        'Cutting 30 minutes a day',
        Math.max(0, params.unnecessaryHoursPerDay - 0.5)
      ),
      calc('Cutting 1 hour a day', Math.max(0, params.unnecessaryHoursPerDay - 1.0)),
      calc('Cutting 2 hours a day', Math.max(0, params.unnecessaryHoursPerDay - 2.0)),
      calc(
        `Improved shutdown practices (${params.shutdownPracticeReductionPct}% cut)`,
        0,
        params.shutdownPracticeReductionPct
      ),
    ];
  }, [params, monthlyKWh, settings.electricityTariff]);

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          What-if energy waste simulator
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Model potential energy, cost and emission reductions across your building by modifying
          operating conditions.
        </p>
      </div>

      {/* Split View: Left Controls, Right Live Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Controls */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-6">
          {/* Top Preset Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
            <button
              type="button"
              onClick={useDetectedWaste}
              className="px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 min-h-[40px]"
            >
              Use my detected waste
            </button>
            <button
              type="button"
              onClick={resetToProposal}
              className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[40px]"
            >
              Reset to the proposal example
            </button>
          </div>

          {/* 5 Labeled Sliders paired with Number Boxes */}
          <div className="space-y-5 text-xs">
            {/* 1. Number of rooms */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-rooms" className="font-bold text-slate-800 dark:text-slate-200">
                  Number of rooms
                </label>
                <input
                  id="input-rooms"
                  type="number"
                  min={1}
                  max={200}
                  value={params.roomCount}
                  onChange={(e) =>
                    setParams({ ...params, roomCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-20 text-right px-2 py-1 font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={params.roomCount}
                onChange={(e) => setParams({ ...params, roomCount: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                aria-label="Number of rooms slider"
              />
            </div>

            {/* 2. Equipment power per room (kW) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-power" className="font-bold text-slate-800 dark:text-slate-200">
                  Equipment power per room (kW)
                </label>
                <input
                  id="input-power"
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={50}
                  value={params.powerKWPerRoom}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      powerKWPerRoom: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                    })
                  }
                  className="w-20 text-right px-2 py-1 font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <input
                type="range"
                step="0.1"
                min={0.2}
                max={15}
                value={params.powerKWPerRoom}
                onChange={(e) =>
                  setParams({ ...params, powerKWPerRoom: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                aria-label="Equipment power per room slider"
              />
            </div>

            {/* 3. Unnecessary operation per day (hours) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-hours" className="font-bold text-slate-800 dark:text-slate-200">
                  Unnecessary operation per day (hours)
                </label>
                <input
                  id="input-hours"
                  type="number"
                  step="0.25"
                  min={0.25}
                  max={24}
                  value={params.unnecessaryHoursPerDay}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      unnecessaryHoursPerDay: Math.max(0.25, parseFloat(e.target.value) || 0.25),
                    })
                  }
                  className="w-20 text-right px-2 py-1 font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <input
                type="range"
                step="0.25"
                min={0.25}
                max={12}
                value={params.unnecessaryHoursPerDay}
                onChange={(e) =>
                  setParams({ ...params, unnecessaryHoursPerDay: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                aria-label="Unnecessary operation per day slider"
              />
            </div>

            {/* 4. Days per month */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-days" className="font-bold text-slate-800 dark:text-slate-200">
                  Days per month
                </label>
                <input
                  id="input-days"
                  type="number"
                  min={1}
                  max={31}
                  value={params.daysPerMonth}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      daysPerMonth: Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)),
                    })
                  }
                  className="w-20 text-right px-2 py-1 font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <input
                type="range"
                min={1}
                max={31}
                value={params.daysPerMonth}
                onChange={(e) => setParams({ ...params, daysPerMonth: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                aria-label="Days per month slider"
              />
            </div>

            {/* 5. Share of waste removed by improved shutdown practices (%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-pct" className="font-bold text-slate-800 dark:text-slate-200">
                  Share removed by shutdown practices (%)
                </label>
                <input
                  id="input-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={params.shutdownPracticeReductionPct}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      shutdownPracticeReductionPct: Math.max(
                        0,
                        Math.min(100, parseInt(e.target.value, 10) || 0)
                      ),
                    })
                  }
                  className="w-20 text-right px-2 py-1 font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={params.shutdownPracticeReductionPct}
                onChange={(e) =>
                  setParams({
                    ...params,
                    shutdownPracticeReductionPct: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                aria-label="Share removed by shutdown practices slider"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Live Results */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step-by-step working shown line by line */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-700 rounded space-y-2">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
              Calculation working (line by line)
            </div>
            <div className="font-mono text-sm text-slate-900 dark:text-slate-100 space-y-1">
              <div>
                {params.roomCount} rooms &times; {params.powerKWPerRoom.toFixed(2)} kW &times;{' '}
                {params.unnecessaryHoursPerDay.toFixed(2)} h ={' '}
                <strong className="text-amber-800 dark:text-amber-400">
                  {dailyKWh.toFixed(1)} kWh/day
                </strong>
              </div>
              <div>
                {dailyKWh.toFixed(1)} kWh/day &times; {params.daysPerMonth} days ={' '}
                <strong className="text-amber-800 dark:text-amber-400">
                  {monthlyKWh.toFixed(1)} kWh/month
                </strong>{' '}
                ({yearlyKWh.toFixed(0)} kWh/year)
              </div>
            </div>
          </div>

          {/* Figures band with monthly (and yearly) */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700">
              {/* Monthly Energy */}
              <div className="p-3">
                <div className="text-xs uppercase font-medium text-slate-500 dark:text-slate-400">
                  Monthly energy
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatEnergy(monthlyKWh)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {yearlyKWh.toLocaleString()} kWh / year
                </div>
              </div>

              {/* Monthly Cost */}
              <div className="p-3">
                <div className="text-xs uppercase font-medium text-slate-500 dark:text-slate-400">
                  Monthly cost
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrency(monthlyCost, settings.currencySymbol)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatCurrency(yearlyCost, settings.currencySymbol)} / year
                </div>
              </div>

              {/* Monthly CO2 */}
              <div className="p-3">
                <div className="text-xs uppercase font-medium text-slate-500 dark:text-slate-400">
                  Monthly emissions
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {monthlyCO2.toFixed(1)} kg
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {(yearlyCO2 / 1000).toFixed(2)} metric tons CO₂ / year
                </div>
              </div>
            </div>
          </div>

          {/* Scenario comparison table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-5 space-y-3">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Action scenario comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare potential monthly savings and remaining avoidable waste across intervention
                strategies.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-bold">Intervention scenario</th>
                    <th className="py-2.5 px-3 text-right font-bold">Remaining kWh</th>
                    <th className="py-2.5 px-3 text-right font-bold">Saved kWh</th>
                    <th className="py-2.5 px-3 text-right font-bold">Monthly savings</th>
                    <th className="py-2.5 px-3 text-left font-bold w-28">Remaining waste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scenarios.map((sc, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {sc.label}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {sc.remainingKWh.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {sc.savedKWh > 0 ? `+${sc.savedKWh.toFixed(1)}` : '0.0'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(sc.savedCost, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-sm overflow-hidden">
                          <div
                            style={{ width: `${sc.barPct}%` }}
                            className="h-full bg-amber-600 transition-all duration-300"
                            title={`${sc.barPct.toFixed(0)}% remaining`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
