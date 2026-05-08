import { useEffect, useState } from "react";
import { api } from "../api";
import type { Property } from "../api";

interface Props {
  onClose: () => void;
  onGenerate: (propertyId: number, startDate: string, endDate: string) => void;
  prefillPropertyId?: number;
}

function defaultStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExportModal({ onClose, onGenerate, prefillPropertyId }: Props) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<number | "">(prefillPropertyId ?? "");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(todayDate());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProperties().then(setProperties).catch(() => setError("Failed to load properties"));
  }, []);

  function handleGenerate() {
    if (!propertyId) {
      setError("Select a property.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Both dates are required.");
      return;
    }
    onGenerate(propertyId as number, startDate, endDate);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4">
          <div className="text-sm font-bold uppercase tracking-widest text-amber-400">Records Export</div>
          <div className="text-lg font-bold mt-0.5">Generate Property Records</div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Produces a complete structured document of all impairment records for the selected property and date range — suitable for legal discovery, AHJ requests, or carrier audits.
          </p>

          {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Property
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={propertyId}
              onChange={e => setPropertyId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select a property…</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors"
          >
            Generate Export →
          </button>
        </div>
      </div>
    </div>
  );
}
