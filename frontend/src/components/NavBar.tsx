interface NavBarProps {
  onNewImpairment?: () => void;
  onExportRecords?: () => void;
  onViewProperties?: () => void;
  onStartWalkthrough?: () => void;
  onResetDemo?: () => void;
  activeView?: string;
}

export function NavBar({ onNewImpairment, onExportRecords, onViewProperties, onStartWalkthrough, onResetDemo, activeView }: NavBarProps) {
  return (
    <nav className="bg-slate-900 shadow-lg border-b border-slate-700 no-print">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
              🔥
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none tracking-tight">
                ImpairmentOS
              </div>
              <div className="text-amber-400 text-xs mt-0.5 font-medium tracking-wide">
                Fire Protection Impairment Management
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            {onViewProperties && (
              <button
                onClick={onViewProperties}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  activeView === "properties"
                    ? "bg-slate-700 text-white font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                Properties
              </button>
            )}
            {onStartWalkthrough && (
              <button
                onClick={onStartWalkthrough}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  activeView === "walkthrough"
                    ? "bg-amber-600 text-white font-semibold"
                    : "text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                }`}
              >
                ▶ Cedar Heights Demo
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onResetDemo && (
            <button
              onClick={onResetDemo}
              className="px-3 py-1.5 border border-slate-600 text-slate-400 rounded-lg text-xs hover:bg-slate-800 hover:text-slate-200 transition-colors font-medium"
              title="Reset all data to Cedar Heights demo scenario"
            >
              ↺ Reset Demo
            </button>
          )}
          {onExportRecords && (
            <button
              onClick={onExportRecords}
              className="px-4 py-2 border border-slate-500 text-slate-200 rounded-lg text-sm hover:bg-slate-800 transition-colors font-medium"
            >
              Export Records
            </button>
          )}
          {onNewImpairment && (
            <button
              onClick={onNewImpairment}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-bold text-sm hover:bg-amber-400 active:bg-amber-600 transition-colors shadow-sm"
            >
              + New Impairment
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
