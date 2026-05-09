interface NavBarProps {
  onNewImpairment?: () => void;
  onExportRecords?: () => void;
  onViewProperties?: () => void;
  onViewDeficiencies?: () => void;
  onStartWalkthrough?: () => void;
  onResetDemo?: () => void;
  onHome?: () => void;
  activeView?: string;
}

export function NavBar({ onNewImpairment, onExportRecords, onViewProperties, onViewDeficiencies, onStartWalkthrough, onResetDemo, onHome, activeView }: NavBarProps) {
  return (
    <nav className="bg-slate-900 shadow-xl border-b border-slate-700/60 no-print">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-4 sm:gap-6">
          <div
            className={`flex items-center gap-2 sm:gap-3 ${onHome ? "cursor-pointer" : "cursor-default"}`}
            onClick={onHome}
            title={onHome ? "Alt+D — Dashboard" : undefined}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 shadow-lg shadow-amber-500/30 ring-1 ring-amber-400/40">
              🔥
            </div>
            <div>
              <div className="text-white font-bold text-base sm:text-lg leading-none tracking-tight">
                ImpairmentOS
              </div>
              <div className="text-amber-400/80 text-[10px] sm:text-xs mt-0.5 font-medium tracking-wide hidden sm:block">
                Fire Protection Impairment Management
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-1 sm:ml-2">
            {onViewProperties && (
              <button
                onClick={onViewProperties}
                title="Alt+P"
                className={`px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium ${
                  activeView === "properties"
                    ? "bg-slate-700/80 text-white shadow-sm ring-1 ring-slate-600/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                Properties
              </button>
            )}
            {onViewDeficiencies && (
              <button
                onClick={onViewDeficiencies}
                title="Alt+F"
                className={`px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium ${
                  activeView === "deficiencies"
                    ? "bg-slate-700/80 text-white shadow-sm ring-1 ring-slate-600/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                Deficiencies
              </button>
            )}
            {onStartWalkthrough && (
              <button
                onClick={onStartWalkthrough}
                className={`px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium ${
                  activeView === "walkthrough"
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                <span className="hidden sm:inline">▶ Cedar Heights Demo</span>
                <span className="sm:hidden">▶ Demo</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onResetDemo && (
            <button
              onClick={onResetDemo}
              className="px-2.5 sm:px-3.5 py-1.5 border border-slate-700 text-slate-400 rounded-lg text-xs hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600 transition-all duration-200 font-medium hidden sm:block"
              title="Reset all data to Cedar Heights demo scenario"
            >
              ↺ Reset Demo
            </button>
          )}
          {onExportRecords && (
            <button
              onClick={onExportRecords}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-600/80 text-slate-200 rounded-lg text-xs sm:text-sm hover:bg-slate-800 hover:border-slate-500 transition-all duration-200 font-medium hidden sm:block"
            >
              Export Records
            </button>
          )}
          {onNewImpairment && (
            <button
              onClick={onNewImpairment}
              title="Alt+N"
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 bg-amber-500 text-slate-900 rounded-lg font-bold text-xs sm:text-sm hover:bg-amber-400 active:bg-amber-600 transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-400/35 hover:scale-[1.03]"
            >
              + New Impairment
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
