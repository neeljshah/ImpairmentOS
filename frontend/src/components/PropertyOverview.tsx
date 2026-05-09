import { useEffect, useState } from "react";
import { api } from "../api";
import { DeficiencyList } from "./DeficiencyList";

interface PropertyOverviewItem {
  id: number;
  name: string;
  address: string;
  jurisdiction_name: string;
  nfpa25_edition: string;
  compliance_status: "red" | "amber" | "green";
  active_impairments_count: number;
  open_deficiencies_count: number;
  violation_count: number;
  total_impairments_90d: number;
  last_impairment_date: string | null;
}

interface Props {
  onFilterDashboard: (propertyId: number) => void;
  onExportRecords: (propertyId: number) => void;
}

const statusConfig = {
  red: { dot: "bg-red-500", label: "Violations", labelClass: "text-red-700 font-bold" },
  amber: { dot: "bg-amber-500", label: "Active", labelClass: "text-amber-700 font-semibold" },
  green: { dot: "bg-green-500", label: "Compliant", labelClass: "text-green-700 font-semibold" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PropertyOverview({ onFilterDashboard, onExportRecords }: Props) {
  const [items, setItems] = useState<PropertyOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPropertyId, setExpandedPropertyId] = useState<number | null>(null);

  useEffect(() => {
    api.getPropertyOverview()
      .then(setItems)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-16 text-center text-slate-500">Loading properties…</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const redCount = items.filter(i => i.compliance_status === "red").length;
  const amberCount = items.filter(i => i.compliance_status === "amber").length;
  const greenCount = items.filter(i => i.compliance_status === "green").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Properties</h1>
        <p className="text-sm text-slate-500 mt-0.5">Portfolio compliance status across all managed properties</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Violations", count: redCount, color: "border-red-500", valueColor: "text-red-600", sub: "immediate action" },
          { label: "Active Impairments", count: amberCount, color: "border-amber-500", valueColor: "text-amber-600", sub: "in progress" },
          { label: "Compliant", count: greenCount, color: "border-green-500", valueColor: "text-green-600", sub: "no active impairments" },
        ].map((s, i) => (
          <div key={i} className={`bg-white rounded-lg border-l-4 ${s.color} px-5 py-4 shadow-sm`}>
            <div className={`text-3xl font-bold ${s.valueColor}`}>{s.count}</div>
            <div className="text-sm font-semibold text-slate-700 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Property table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Property</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Jurisdiction</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Active</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Violations</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">90-Day</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Impairment</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const cfg = statusConfig[item.compliance_status];
              return (
                <tr key={item.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className={`text-xs ${cfg.labelClass}`}>{cfg.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.address}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{item.jurisdiction_name}</div>
                    <span className="inline-block text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono mt-0.5">
                      NFPA {item.nfpa25_edition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${item.active_impairments_count > 0 ? "text-red-600" : "text-slate-400"}`}>
                      {item.active_impairments_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${item.violation_count > 0 ? "text-red-600" : "text-slate-400"}`}>
                      {item.violation_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{item.total_impairments_90d}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.last_impairment_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setExpandedPropertyId(expandedPropertyId === item.id ? null : item.id)}
                        className="px-2.5 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
                      >
                        {expandedPropertyId === item.id ? "▲ Hide" : "▼ Details"}
                      </button>
                      <button
                        onClick={() => onFilterDashboard(item.id)}
                        className="px-2.5 py-1 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 transition-colors font-medium"
                      >
                        Dashboard →
                      </button>
                      <button
                        onClick={() => onExportRecords(item.id)}
                        className="px-2.5 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
                      >
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* Expanded deficiency row */}
            {expandedPropertyId && (() => {
              const item = items.find(i => i.id === expandedPropertyId);
              if (!item) return null;
              return (
                <tr key={`expand-${expandedPropertyId}`}>
                  <td colSpan={8} className="px-4 py-4 bg-slate-50 border-b border-slate-200">
                    <DeficiencyList propertyId={expandedPropertyId} propertyName={item.name} />
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
