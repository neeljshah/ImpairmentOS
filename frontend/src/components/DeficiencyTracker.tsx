import { useEffect, useState } from "react";
import { api } from "../api";
import type { Deficiency, Property } from "../api";
import { formatDate, systemTypeLabel } from "../utils";

interface Props {
  onBack: () => void;
}

function SeverityBadge({ severity }: { severity: string }) {
  return severity === "critical"
    ? <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-800 rounded">CRITICAL</span>
    : <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded">NON-CRITICAL</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-red-100 text-red-800",
    proposal_sent: "bg-amber-100 text-amber-800",
    customer_declined: "bg-orange-100 text-orange-800",
    repair_scheduled: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
  };
  const labels: Record<string, string> = {
    open: "Open",
    proposal_sent: "Proposal Sent",
    customer_declined: "Customer Declined",
    repair_scheduled: "Repair Scheduled",
    resolved: "Resolved",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {labels[status] || status}
    </span>
  );
}

function AgingBar({ daysOpen, resolved }: { daysOpen: number; resolved: boolean }) {
  if (resolved) return null;
  const pct = Math.min(daysOpen / 90, 1) * 100;
  const color = daysOpen > 60 ? "bg-red-500" : daysOpen > 30 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RiskTag({ deficiency }: { deficiency: Deficiency }) {
  const risks: string[] = [];
  if (!deficiency.on_itm_report && deficiency.status !== "resolved") {
    risks.push("NOT ON ITM REPORT");
  }
  if (deficiency.status === "proposal_sent" && deficiency.days_open > 30) {
    risks.push("NO RESPONSE 30+ DAYS");
  }
  if (deficiency.status === "customer_declined") {
    risks.push("CUSTOMER DECLINED — LIABILITY RISK");
  }
  if (deficiency.days_open > 90 && deficiency.status !== "resolved") {
    risks.push("OPEN 90+ DAYS");
  }
  if (risks.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {risks.map((r, i) => (
        <span key={i} className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">
          {r}
        </span>
      ))}
    </div>
  );
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; style: string }[]> = {
  open: [
    { label: "Send Proposal", next: "proposal_sent", style: "bg-amber-500 text-white hover:bg-amber-600" },
    { label: "Mark Resolved", next: "resolved", style: "bg-green-600 text-white hover:bg-green-700" },
  ],
  proposal_sent: [
    { label: "Schedule Repair", next: "repair_scheduled", style: "bg-blue-600 text-white hover:bg-blue-700" },
    { label: "Customer Declined", next: "customer_declined", style: "bg-orange-500 text-white hover:bg-orange-600" },
    { label: "Mark Resolved", next: "resolved", style: "bg-green-600 text-white hover:bg-green-700" },
  ],
  customer_declined: [
    { label: "Resend Proposal", next: "proposal_sent", style: "bg-amber-500 text-white hover:bg-amber-600" },
    { label: "Mark Resolved", next: "resolved", style: "bg-green-600 text-white hover:bg-green-700" },
  ],
  repair_scheduled: [
    { label: "Mark Resolved", next: "resolved", style: "bg-green-600 text-white hover:bg-green-700" },
  ],
  resolved: [],
};

export function DeficiencyTracker({ onBack: _onBack }: Props) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [allDeficiencies, setAllDeficiencies] = useState<(Deficiency & { propertyName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all_open");
  const [filterProperty, setFilterProperty] = useState<number | "all">("all");
  const [updating, setUpdating] = useState<number | null>(null);

  async function handleStatusUpdate(defId: number, newStatus: string) {
    setUpdating(defId);
    try {
      const updated = await api.updateDeficiencyStatus(defId, { status: newStatus });
      setAllDeficiencies(prev => prev.map(d =>
        d.id === defId ? { ...updated, propertyName: d.propertyName } : d
      ));
    } catch (e) {
      alert(`Failed to update status: ${String(e)}`);
    } finally {
      setUpdating(null);
    }
  }

  useEffect(() => {
    Promise.all([
      api.getProperties(),
      api.getPropertyOverview(),
    ]).then(async ([props]) => {
      setProperties(props);
      const results: (Deficiency & { propertyName: string })[] = [];
      for (const p of props) {
        try {
          const defs = await api.getPropertyDeficiencies(p.id);
          results.push(...defs.map(d => ({ ...d, propertyName: p.name })));
        } catch {}
      }
      setAllDeficiencies(results);
    }).catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allDeficiencies.filter(d => {
    if (filterProperty !== "all" && d.property_id !== filterProperty) return false;
    if (filterStatus === "all_open" && d.status === "resolved") return false;
    if (filterStatus !== "all_open" && filterStatus !== "all" && d.status !== filterStatus) return false;
    return true;
  });

  const openCount = allDeficiencies.filter(d => d.status !== "resolved").length;
  const offReportCount = allDeficiencies.filter(d => !d.on_itm_report && d.status !== "resolved").length;
  const criticalCount = allDeficiencies.filter(d => d.severity === "critical" && d.status !== "resolved").length;
  const avgAge = (() => {
    const open = allDeficiencies.filter(d => d.status !== "resolved");
    if (open.length === 0) return 0;
    return Math.round(open.reduce((s, d) => s + d.days_open, 0) / open.length);
  })();

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-16 text-center text-slate-500">Loading deficiencies...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Deficiency Tracker</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track deficiencies from discovery through resolution — the gap between "we found it" and "it's on the record"
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border-l-4 border-red-500 px-5 py-4 shadow-sm">
          <div className="text-3xl font-bold text-red-600">{openCount}</div>
          <div className="text-sm font-semibold text-slate-700 mt-0.5">Open Deficiencies</div>
          <div className="text-xs text-slate-400">across all properties</div>
        </div>
        <div className="bg-white rounded-lg border-l-4 border-orange-500 px-5 py-4 shadow-sm">
          <div className="text-3xl font-bold text-orange-600">{offReportCount}</div>
          <div className="text-sm font-semibold text-slate-700 mt-0.5">Off ITM Report</div>
          <div className="text-xs text-slate-400">invisible to AHJ/carrier</div>
        </div>
        <div className="bg-white rounded-lg border-l-4 border-amber-500 px-5 py-4 shadow-sm">
          <div className="text-3xl font-bold text-amber-600">{criticalCount}</div>
          <div className="text-sm font-semibold text-slate-700 mt-0.5">Critical Open</div>
          <div className="text-xs text-slate-400">immediate action required</div>
        </div>
        <div className="bg-white rounded-lg border-l-4 border-slate-300 px-5 py-4 shadow-sm">
          <div className="text-3xl font-bold text-slate-500">{avgAge}d</div>
          <div className="text-sm font-semibold text-slate-700 mt-0.5">Avg Open Age</div>
          <div className="text-xs text-slate-400">days since reported</div>
        </div>
      </div>

      {offReportCount > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange-600 font-bold text-sm">
              WARNING: {offReportCount} deficienc{offReportCount === 1 ? "y" : "ies"} not on ITM report
            </span>
          </div>
          <p className="text-sm text-orange-800">
            These deficiencies are known to Beacon but do not appear on any report submitted to the AHJ or carrier.
            In a post-incident records request, this gap is discoverable and creates liability exposure.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-xs text-slate-500 font-medium">Status:</label>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-slate-300 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="all_open">All Open</option>
          <option value="open">Open — No Action</option>
          <option value="proposal_sent">Proposal Sent</option>
          <option value="customer_declined">Customer Declined</option>
          <option value="repair_scheduled">Repair Scheduled</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <label className="text-xs text-slate-500 font-medium ml-2">Property:</label>
        <select
          value={filterProperty}
          onChange={e => setFilterProperty(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="text-xs border border-slate-300 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="all">All Properties</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Deficiency cards */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="text-2xl mb-2">&#10003;</div>
          <div className="text-slate-400 text-sm">No deficiencies match the current filter</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const isAlarm = !d.on_itm_report && d.status !== "resolved";
            return (
              <div
                key={d.id}
                className={`rounded-lg border overflow-hidden shadow-sm ${
                  isAlarm ? "border-orange-300" : d.status === "resolved" ? "border-slate-200" : "border-slate-200"
                }`}
              >
                <div className={`h-1 ${isAlarm ? "bg-orange-500" : d.status === "resolved" ? "bg-green-500" : "bg-slate-300"}`} />
                <div className={`p-4 ${isAlarm ? "bg-orange-50" : d.status === "resolved" ? "bg-white" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-semibold text-slate-900 text-sm">{d.propertyName}</span>
                        <SeverityBadge severity={d.severity} />
                        <StatusBadge status={d.status} />
                        {d.system_type && (
                          <span className="text-xs text-slate-500">
                            {systemTypeLabel(d.system_type)}{d.system_zone ? ` — ${d.system_zone}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-800">{d.description}</div>
                      {d.nfpa_reference && (
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{d.nfpa_reference}</div>
                      )}
                      {d.proposal_response && (
                        <div className="text-xs text-slate-600 mt-1 italic">Response: {d.proposal_response}</div>
                      )}
                      <RiskTag deficiency={d} />
                      <AgingBar daysOpen={d.days_open} resolved={d.status === "resolved"} />
                      {STATUS_TRANSITIONS[d.status]?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {STATUS_TRANSITIONS[d.status].map(t => (
                            <button
                              key={t.next}
                              onClick={() => handleStatusUpdate(d.id, t.next)}
                              disabled={updating === d.id}
                              className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors disabled:opacity-50 ${t.style}`}
                            >
                              {updating === d.id ? "..." : t.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className={`text-lg font-bold tabular-nums ${
                        d.days_open > 60 && d.status !== "resolved" ? "text-red-600" : "text-slate-700"
                      }`}>
                        {d.days_open}d
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase">
                        {d.status === "resolved" ? "total" : "open"}
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(d.reported_at)}</div>
                      <div className={`text-xs font-bold ${
                        d.on_itm_report ? "text-green-700" : d.status !== "resolved" ? "text-red-600" : "text-slate-400"
                      }`}>
                        {d.on_itm_report ? "On ITM" : "Off ITM"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
