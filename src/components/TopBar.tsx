import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { TabId, useAudit } from '../context/AuditContext';

export const TopBar: React.FC = () => {
  const { activeTab, setActiveTab, isDemoMode, theme, setTheme } = useAudit();

  const tabs: { id: TabId; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'room-analysis', label: 'Room analysis' },
    { id: 'waste-audit', label: 'Waste audit' },
    { id: 'what-if', label: 'What-if simulator' },
    { id: 'settings', label: 'Data and settings' },
  ];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 md:py-0 min-h-[56px] gap-3">
          {/* Site Title & Mobile Theme Controls */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              WattWise: Energy Waste Detection and Audit Portal
            </h1>

            {/* Theme switcher on mobile */}
            <div
              className="md:hidden inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-300 dark:border-slate-700"
              role="group"
              aria-label="Appearance theme selection"
            >
              <button
                type="button"
                id="mobile-theme-light"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Light mode"
                aria-pressed={theme === 'light'}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                id="mobile-theme-dark"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Dark mode"
                aria-pressed={theme === 'dark'}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                id="mobile-theme-system"
                onClick={() => setTheme('system')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  theme === 'system'
                    ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Follow device theme"
                aria-pressed={theme === 'system'}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs and Desktop Theme Control */}
          <nav
            aria-label="Main Navigation"
            className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar -mb-px"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors border-b-2 min-h-[44px] flex items-center ${
                    isActive
                      ? 'border-amber-600 text-slate-900 dark:text-white font-bold'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                </button>
              );
            })}

            {/* Theme switcher on desktop */}
            <div className="hidden md:flex items-center pl-3 border-l border-slate-200 dark:border-slate-800">
              <div
                className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-300 dark:border-slate-700"
                role="group"
                aria-label="Appearance theme selection"
              >
                <button
                  type="button"
                  id="desktop-theme-light"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                    theme === 'light'
                      ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Switch to light mode"
                  aria-pressed={theme === 'light'}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  id="desktop-theme-dark"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                    theme === 'dark'
                      ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Switch to dark mode"
                  aria-pressed={theme === 'dark'}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  id="desktop-theme-system"
                  onClick={() => setTheme('system')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                    theme === 'system'
                      ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Match operating system theme"
                  aria-pressed={theme === 'system'}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Device</span>
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Demo notice strip */}
      {isDemoMode && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-t border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span>
              Demo data loaded. Building schedules, equipment run times and power ratings can be
              edited at any time.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="ml-3 font-bold underline hover:text-amber-800 dark:hover:text-amber-100 whitespace-nowrap"
            >
              Go to Data and settings
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
