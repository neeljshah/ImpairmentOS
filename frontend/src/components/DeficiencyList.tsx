import { useEffect, useState } from "react";
import { api } from "../api";
import type { Deficiency } from "../api";
import { formatDate, systemTypeLabel } from "../utils";

interface Props {
  propertyId: number;
  propertyName: string;
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

export function DeficiencyList({ propertyId, propertyName }: Props) {
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPropertyDeficiencies(propertyId)
      .then(setDeficiencies)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <div className="text-xs text-slate-400 py-2">Loading deficiencies…</div>;
  if (error) return <div className="text-xs text-red-500 py-2">Error loading deficiencies</div>;
  if (deficiencies.length === 0) return (
    <div className="text-xs text-slate-400 py-2 italic">No deficiencies recorded for this property.</div>
  );

  return (
    <div className="mt-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
        Deficiencies — {propertyName} ({deficiencies.length})
      </div>
      <div className="space-y-2">
        {deficiencies.map(d => {
          const isAlarm = !d.on_itm_report && d.status !== "resolved";
          return (
            <div
              key={d.id}
              className={`rounded-lg border p-3 text-sm ${
                isAlarm ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <SeverityBadge severity={d.severity} />
                    <StatusBadge status={d.status} />
                    {d.system_type && (
                      <span className="text-xs text-slate-500">
                        {systemTypeLabel(d.system_type)}{d.system_zone ? ` — ${d.system_zone}` : ""}
                      </span>
                    )}
                    {d.nfpa_reference && (
                      <span className="text-xs text-slate-400 font-mono">{d.nfpa_reference}</span>
                    )}
                  </div>
                  <div className="text-slate-800 font-medium">{d.description}</div>
                  {d.proposal_response && (
                    <div className="text-xs text-slate-600 mt-1 italic">Response: {d.proposal_response}</div>
                  )}
                  {d.notes && isAlarm && (
                    <div className="text-xs text-orange-800 font-semibold mt-1">⚠ {d.notes}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0 text-xs text-slate-500 space-y-1">
                  <div>
                    <span className={`font-bold ${d.days_open > 60 && d.status !== "resolved" ? "text-red-600" : "text-slate-700"}`}>
                      {d.days_open} days
                    </span>
                    {d.status !== "resolved" ? " open" : " (resolved)"}
                  </div>
                  <div>Since {formatDate(d.reported_at)}</div>
                  <div className={`font-bold ${d.on_itm_report ? "text-green-700" : (d.status !== "resolved" ? "text-red-600" : "text-slate-400")}`}>
                    {d.on_itm_report ? "✓ On ITM report" : "✗ Not on ITM report"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
