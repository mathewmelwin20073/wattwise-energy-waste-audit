import React from 'react';
import { DashboardView } from './components/DashboardView';
import { DataSettingsView } from './components/DataSettingsView';
import { Footer } from './components/Footer';
import { RoomAnalysisView } from './components/RoomAnalysisView';
import { TopBar } from './components/TopBar';
import { WasteAuditView } from './components/WasteAuditView';
import { WhatIfSimulatorView } from './components/WhatIfSimulatorView';
import { AuditProvider, useAudit } from './context/AuditContext';

const MainPortal: React.FC = () => {
  const { activeTab, setActiveTab, rooms, resetToDemo } = useAudit();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased selection:bg-amber-200 dark:selection:bg-amber-800">
      {/* Top Bar with Navigation Tabs and Demo Strip */}
      <TopBar />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {rooms.length === 0 && activeTab !== 'settings' ? (
          /* Empty State as specified: short explanation and two buttons */
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 my-12">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              No building data is currently loaded
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The Energy Waste Audit portal requires room schedules and equipment operating records
              to identify unnecessary energy usage.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={resetToDemo}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 min-h-[40px]"
              >
                Load demo data
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[40px]"
              >
                Enter my own data
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'room-analysis' && <RoomAnalysisView />}
            {activeTab === 'waste-audit' && <WasteAuditView />}
            {activeTab === 'what-if' && <WhatIfSimulatorView />}
            {activeTab === 'settings' && <DataSettingsView />}
          </>
        )}
      </main>

      {/* Footer with estimate disclaimer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuditProvider>
      <MainPortal />
    </AuditProvider>
  );
}
