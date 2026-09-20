import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          All figures are estimates based on the entered schedules, power ratings and run times.
        </p>
      </div>
    </footer>
  );
};
