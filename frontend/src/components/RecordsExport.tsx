import { useEffect, useState } from "react";
import { api } from "../api";
import type { ExportData, PacketData } from "../api";
import { formatDateTime, systemTypeLabel, statusLabel, statusColor } from "../utils";

interface Props {
  propertyId: number;
  startDate: string;
  endDate: string;
  onBack: () => void;
}

function ComplianceTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete: "bg-green-100 text-green-800",
    missing: "bg-red-100 text-red-800",
    partial: "bg-yellow-100 text-yellow-800",
    not_required: "bg-slate-100 text-slate-500",
  };
  const labels: Record<string, string> = {
    complete: "✓",
    missing: "✗",
    partial: "~",
    not_required: "N/A",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${map[status] || "bg-slate-100 text-slate-500"}`}>
      {labels[status] || status}
    </span>
  );
}

function ImpairmentEntry({ packet, index }: { packet: PacketData; index: number }) {
  const hasViolations = packet.compliance_violations.length > 0;
  return (
    <div className={`border rounded-lg overflow-hidden mb-4 ${hasViolations ? "border-red-300" : "border-slate-200"}`}>
      <div className={`px-4 py-2 flex items-center justify-between text-sm ${hasViolations ? "bg-red-50" : "bg-slate-50"}`}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500">#{index + 1}</span>
          <span className="font-bold text-slate-800">{packet.impairment_number}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(packet.status)}`}>
            {statusLabel(packet.status)}
          </span>
        </div>
        <div className="text-xs text-slate-500 font-mono">{packet.duration_str}</div>
      </div>

      <div className="px-4 py-3 text-sm space-y-2">
        <div>
          <span className="font-semibold text-slate-700">
            {systemTypeLabel(packet.system.type)}{packet.system.zone ? ` — ${packet.system.zone}` : ""}
          </span>
          <span className="text-slate-500 ml-2">{packet.timeline.reason}</span>
        </div>

        <div className="text-xs text-slate-500 space-y-0.5">
          <div>Opened: {formatDateTime(packet.timeline.opened_at)} by {packet.timeline.opened_by}</div>
          {packet.timeline.ahj_notified_at && (
            <div>AHJ Notified: {formatDateTime(packet.timeline.ahj_notified_at)}</div>
          )}
          {packet.timeline.fire_watch_started_at && (
            <div>
              Fire Watch: {formatDateTime(packet.timeline.fire_watch_started_at)}
              {packet.timeline.fire_watch_ended_at ? ` → ${formatDateTime(packet.timeline.fire_watch_ended_at)}` : " (ongoing)"}
            </div>
          )}
          {packet.timeline.closed_at && (
            <div>Closed: {formatDateTime(packet.timeline.closed_at)} by {packet.impairment.closed_by || "—"}</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {packet.compliance_items.map((item, i) => (
            <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
              <ComplianceTag status={item.status} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {hasViolations && (
          <div className="text-xs text-red-700 font-semibold">
            {packet.compliance_violations.map((v, i) => (
              <div key={i}>✗ {v.message}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RecordsExport({ propertyId, startDate, endDate, onBack }: Props) {
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getExport(propertyId, startDate, endDate)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [propertyId, startDate, endDate]);

  if (loading) return (
    <div className="max-w-4xl mx-auto p-8 text-center text-slate-500">
      Generating records export…
    </div>
  );
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return null;

  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  const compliancePct = Math.round(data.summary.compliance_rate * 100);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Screen controls */}
      <div className="no-print flex items-center gap-3 mb-5">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          ← Back to Dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 transition-colors font-medium"
        >
          Print / Export PDF
        </button>
      </div>

      <div className="border border-slate-300 rounded-xl overflow-hidden shadow-md print:border-0 print:shadow-none">

        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
              🔥
            </div>
            <div>
              <div className="text-xs text-amber-400 uppercase tracking-widest font-semibold">
                Impairment Records — Portfolio Export
              </div>
              <div className="text-xl font-bold text-white leading-tight">ImpairmentOS</div>
            </div>
          </div>
          <div className="text-sm text-slate-400 mt-1 pl-12 font-mono">
            Generated {generatedAt}
          </div>
        </div>

        <div className="p-6 space-y-6 bg-white">

          {/* Property details */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Property</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-slate-900">{data.property.name}</div>
                <div className="text-slate-600 mt-1">{data.property.address}</div>
                {data.property.owner_entity && <div className="text-slate-500 mt-0.5">Owner: {data.property.owner_entity}</div>}
                {data.property.property_manager && <div className="text-slate-500">PM: {data.property.property_manager}</div>}
                {data.property.carrier_name && <div className="text-slate-500">Carrier: {data.property.carrier_name} {data.property.carrier_account ? `(${data.property.carrier_account})` : ""}</div>}
              </div>
              <div>
                <div className="font-semibold text-slate-700">Jurisdiction</div>
                <div className="text-slate-600">{data.jurisdiction.name}</div>
                <div className="text-slate-500">NFPA 25: {data.jurisdiction.nfpa25_edition}</div>
                {data.jurisdiction.local_code_ref && <div className="text-slate-500">{data.jurisdiction.local_code_ref}</div>}
                {data.jurisdiction.ahj_contact_name && (
                  <div className="text-slate-500 mt-1">
                    AHJ: {data.jurisdiction.ahj_contact_name}
                    {data.jurisdiction.ahj_contact_phone ? ` · ${data.jurisdiction.ahj_contact_phone}` : ""}
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Date range + summary */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Summary — {data.date_range.start} to {data.date_range.end}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-center">
              {[
                { label: "Total", value: data.summary.total_impairments, color: "text-slate-900" },
                { label: "Closed", value: data.summary.closed, color: "text-green-700" },
                { label: "Active", value: data.summary.open, color: data.summary.open > 0 ? "text-red-600" : "text-slate-500" },
                { label: "Incomplete", value: data.summary.closed_incomplete, color: data.summary.closed_incomplete > 0 ? "text-yellow-700" : "text-slate-500" },
                { label: "Compliance", value: `${compliancePct}%`, color: compliancePct >= 80 ? "text-green-700" : "text-red-600" },
              ].map((s, i) => (
                <div key={i} className="border border-slate-200 rounded-lg py-3 px-2">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {data.summary.avg_duration_hours > 0 && (
              <div className="text-xs text-slate-500 mt-2">
                Avg duration: {data.summary.avg_duration_hours.toFixed(1)} hours per impairment
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Impairment records */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Impairment Records ({data.impairments.length})
            </div>
            {data.impairments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-300 rounded-lg">
                No impairments found in this date range.
              </div>
            ) : (
              data.impairments.map((item, i) => (
                <ImpairmentEntry key={i} packet={item.packet} index={i} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-400 flex justify-between">
            <span>Generated by ImpairmentOS &nbsp;&middot;&nbsp; {generatedAt}</span>
            <span>{data.property.name} &nbsp;&middot;&nbsp; {data.date_range.start} – {data.date_range.end}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
