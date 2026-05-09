import { useEffect, useState } from "react";
import { api } from "../api";
import type { PacketData } from "../api";
import { formatDateTime, formatTime, systemTypeLabel, eventTypeLabel } from "../utils";

interface Props {
  impairmentId: number;
  onBack: () => void;
}

interface TimelinePoint {
  time: string | null;
  label: string;
  detail?: string;
  dotBg: string;
  labelColor: string;
  isMissing?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: "bg-emerald-100 text-emerald-800 ring-emerald-500/30",
    missing: "bg-red-100 text-red-800 ring-red-500/30",
    partial: "bg-yellow-100 text-yellow-800 ring-yellow-500/30",
    not_required: "bg-slate-100 text-slate-500 ring-slate-400/20",
  };
  const labels: Record<string, string> = {
    complete: "COMPLETE",
    missing: "MISSING",
    partial: "PARTIAL",
    not_required: "N/A",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ring-inset ${colors[status] || "bg-slate-100 text-slate-500 ring-slate-400/20"}`}>
      {labels[status] || status.toUpperCase()}
    </span>
  );
}

function ComplianceIcon({ status }: { status: string }) {
  if (status === "complete") return <span className="text-green-600 font-bold text-base">&#10003;</span>;
  if (status === "missing") return <span className="text-red-600 font-bold text-base">&#10007;</span>;
  if (status === "partial") return <span className="text-yellow-500 font-bold text-base">&#9679;</span>;
  return <span className="text-slate-400 text-base">&#8211;</span>;
}

function EventLogEntry({ event }: { event: PacketData["events"][0] }) {
  const colors: Record<string, string> = {
    created: "border-blue-400 bg-blue-50/60",
    ahj_notified: "border-purple-400 bg-purple-50/60",
    fire_watch_started: "border-amber-400 bg-amber-50/60",
    fire_watch_ended: "border-amber-300 bg-amber-50/60",
    repair_started: "border-yellow-400 bg-yellow-50/60",
    repair_completed: "border-emerald-400 bg-emerald-50/60",
    restoration_test_recorded: "border-emerald-500 bg-emerald-50/60",
    closed: "border-emerald-600 bg-emerald-50/60",
    note_added: "border-slate-300 bg-slate-50/60",
    escalation_triggered: "border-red-400 bg-red-50/60",
  };
  const cls = colors[event.event_type] || "border-slate-300 bg-slate-50/60";

  return (
    <div className={`border-l-4 pl-4 py-2.5 rounded-r-xl ${cls} hover:brightness-95 transition-all duration-150`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="font-semibold text-slate-800 text-sm">{eventTypeLabel(event.event_type)}</span>
          <span className="text-slate-500 text-xs ml-2 font-medium">by {event.performed_by}</span>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap ml-4 font-mono">
          {formatDateTime(event.performed_at)}
        </span>
      </div>
      {event.notes && (
        <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{event.notes}</div>
      )}
    </div>
  );
}

function VisualTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) return null;
  return (
    <div className="relative">
      {/* Vertical connector line, centered on the 16px dot column */}
      <div className="absolute left-[7px] top-3 w-0.5 bg-slate-200" style={{ bottom: "12px" }} />
      <div className="space-y-5">
        {points.map((pt, i) => (
          <div key={i} className="flex gap-4 items-start relative">
            {/* Dot */}
            <div className="relative z-10 flex-shrink-0 w-4 mt-0.5">
              {pt.isMissing ? (
                <div className={`w-4 h-4 rounded-full ${pt.dotBg} flex items-center justify-center`}>
                  <span className="text-white font-bold leading-none" style={{ fontSize: "9px" }}>✗</span>
                </div>
              ) : (
                <div className={`w-4 h-4 rounded-full ${pt.dotBg} ring-2 ring-slate-50`} />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 pb-1">
              <div className="flex items-baseline justify-between gap-4">
                <span className={`text-sm font-bold ${pt.labelColor}`}>{pt.label}</span>
                <span className="text-xs font-mono text-slate-400 flex-shrink-0">{pt.time ?? "—"}</span>
              </div>
              {pt.detail && <p className="text-xs text-slate-500 mt-0.5">{pt.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildTimelinePoints(data: PacketData): TimelinePoint[] {
  const points: TimelinePoint[] = [];

  points.push({
    time: formatTime(data.timeline.opened_at),
    label: `OPENED — ${data.timeline.opened_by}`,
    detail: data.timeline.reason,
    dotBg: "bg-slate-800",
    labelColor: "text-slate-900",
  });

  if (data.timeline.ahj_notified_at) {
    points.push({
      time: formatTime(data.timeline.ahj_notified_at),
      label: "AHJ NOTIFIED",
      detail: [
        data.impairment.ahj_notification_method ? `via ${data.impairment.ahj_notification_method}` : null,
        data.impairment.ahj_notification_ref ? `Ref: ${data.impairment.ahj_notification_ref}` : null,
      ].filter(Boolean).join(" — ") || undefined,
      dotBg: "bg-purple-600",
      labelColor: "text-purple-900",
    });
  } else if (data.compliance_violations.some(v => v.type === "ahj_notification")) {
    points.push({
      time: null,
      label: "AHJ NOT NOTIFIED",
      detail: `${data.jurisdiction.local_code_ref} — notification required`,
      dotBg: "bg-red-600",
      labelColor: "text-red-700",
      isMissing: true,
    });
  }

  if (data.timeline.fire_watch_started_at) {
    points.push({
      time: formatTime(data.timeline.fire_watch_started_at),
      label: `FIRE WATCH STARTED — ${data.impairment.fire_watch_assigned_to || "unknown"}`,
      detail: data.impairment.fire_watch_organization || undefined,
      dotBg: "bg-amber-500",
      labelColor: "text-amber-900",
    });
  }

  if (data.timeline.restored_at) {
    points.push({
      time: formatTime(data.timeline.restored_at),
      label: `SYSTEM RESTORED — ${data.impairment.restored_by || "—"}`,
      detail: data.impairment.restoration_notes || undefined,
      dotBg: "bg-green-600",
      labelColor: "text-green-900",
    });
  }

  if (data.timeline.fire_watch_ended_at) {
    points.push({
      time: formatTime(data.timeline.fire_watch_ended_at),
      label: `FIRE WATCH ENDED — ${data.impairment.fire_watch_hours_computed?.toFixed(1)}h total`,
      dotBg: "bg-amber-700",
      labelColor: "text-amber-900",
    });
  }

  if (data.impairment.main_drain_test_performed) {
    const pass = data.impairment.main_drain_test_pass;
    points.push({
      time: "—",
      label: "MAIN DRAIN TEST",
      detail: `Static: ${data.impairment.main_drain_psi_static} PSI · Residual: ${data.impairment.main_drain_psi_residual} PSI · Diff: ${data.impairment.main_drain_psi_differential?.toFixed(1)} PSI — ${pass ? "PASS" : "FAIL"}`,
      dotBg: pass ? "bg-green-500" : "bg-red-500",
      labelColor: pass ? "text-green-900" : "text-red-800",
    });
  }

  if (data.timeline.closed_at) {
    points.push({
      time: formatTime(data.timeline.closed_at),
      label: `CLOSED — ${data.impairment.closed_by || "—"} (supervisor)`,
      detail: data.impairment.closure_notes || undefined,
      dotBg: "bg-slate-900",
      labelColor: "text-slate-900",
    });
  }

  return points;
}

export function ImpairmentPacket({ impairmentId, onBack }: Props) {
  const [data, setData] = useState<PacketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [noteBy, setNoteBy] = useState(() => {
    try { return localStorage.getItem("impairmentos_last_tech") || ""; } catch { return ""; }
  });
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  function reload() {
    api.getPacket(impairmentId).then(setData).catch(e => setError(String(e)));
  }

  useEffect(() => {
    api.getPacket(impairmentId)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [impairmentId]);

  async function handleAddNote() {
    if (!noteText.trim() || !noteBy.trim()) {
      setNoteError("Enter note text and your name.");
      return;
    }
    setNoteError(null);
    setNoteSubmitting(true);
    try {
      await api.addNote(impairmentId, { note: noteText.trim(), performed_by: noteBy.trim() });
      setNoteText("");
      reload();
    } catch (e: any) {
      setNoteError(e?.detail || "Failed to save note");
    } finally {
      setNoteSubmitting(false);
    }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto p-8 text-center text-slate-500">
      Loading impairment packet...
    </div>
  );
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return null;

  const isComplete = data.all_compliant && data.status === "closed";
  const isBroken = data.compliance_violations.length > 0;
  const timelinePoints = buildTimelinePoints(data);

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in-up">
      {/* Screen-only controls */}
      <div className="no-print flex items-center gap-3 mb-5">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 font-medium transition-colors hover:text-slate-900">
          ← Back to Dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 bg-slate-800 text-white rounded-xl text-sm hover:bg-slate-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-[1.02]"
        >
          Print / Export PDF
        </button>
      </div>

      {/* Packet document */}
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xl print:border-0 print:shadow-none">

        {/* Title bar — navy + amber brand */}
        <div className="bg-slate-900 text-white px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
              🔥
            </div>
            <div>
              <div className="text-xs text-amber-400 uppercase tracking-widest font-semibold">
                Impairment Record — Audit Packet
              </div>
              <div className="text-xl font-bold text-white leading-tight">ImpairmentOS</div>
            </div>
          </div>
          <div className="text-sm text-slate-400 mt-1 pl-12 font-mono">
            {data.impairment_number} &nbsp;&middot;&nbsp; Generated {formatDateTime(data.generated_at)}
          </div>
        </div>

        {/* Status banner */}
        {isBroken ? (
          <div className="bg-red-600 text-white px-6 py-3 text-sm font-bold flex items-center gap-2">
            <span>&#10007;</span>
            COMPLIANCE VIOLATIONS PRESENT — Do not use as final audit documentation.
          </div>
        ) : isComplete ? (
          <div className="bg-green-600 text-white px-6 py-3 text-sm font-bold flex items-center gap-2">
            <span>&#10003;</span>
            ALL COMPLIANCE REQUIREMENTS MET — Record complete &amp; audit-ready
          </div>
        ) : (
          <div className="bg-amber-500 text-slate-900 px-6 py-3 text-sm font-bold flex items-center gap-2">
            <span>&#9679;</span>
            IMPAIRMENT IN PROGRESS — Record not yet finalized
          </div>
        )}

        <div className="p-6 space-y-7 bg-white">

          {/* RESOLUTION REQUIRED — only for active impairments with violations */}
          {isBroken && data.status !== "closed" && data.status !== "closed_incomplete" && (
            <div className="bg-red-50/80 border-2 border-red-300/80 rounded-2xl p-5">
              <div className="text-sm font-bold text-red-900 mb-3 uppercase tracking-widest">
                &#9632; Resolution Required
              </div>
              <div className="space-y-3">
                {data.compliance_violations.filter(v => v.blocks_closure).map((v, i) => {
                  const isAHJ = v.type === "ahj_notification" || v.type.includes("ahj");
                  const isDrain = v.type === "main_drain_test" || v.type.includes("drain");
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-600 font-bold mt-0.5">&#10007;</span>
                      <div>
                        <div className="font-semibold text-red-900">{v.message}</div>
                        {isAHJ && data.jurisdiction.ahj_contact && (
                          <div className="text-red-700 text-xs mt-0.5">
                            Action: Contact {data.jurisdiction.ahj_contact} and record the notification reference number.
                          </div>
                        )}
                        {isDrain && (
                          <div className="text-red-700 text-xs mt-0.5">
                            Action: Perform main drain test per NFPA 25 §13.2.5 and record static/residual PSI readings.
                          </div>
                        )}
                        {!isAHJ && !isDrain && (
                          <div className="text-red-700 text-xs mt-0.5">
                            Action: Resolve this violation before closing the impairment.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Property & System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm animate-fade-in stagger-1">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Property</div>
              <div className="font-semibold text-slate-900">{data.property.name}</div>
              <div className="text-slate-600">{data.property.address}</div>
              {data.property.owner_entity && <div className="text-slate-500 mt-0.5">Owner: {data.property.owner_entity}</div>}
              {data.property.property_manager && <div className="text-slate-500">PM: {data.property.property_manager}</div>}
              {data.property.carrier_name && <div className="text-slate-500">Carrier: {data.property.carrier_name}</div>}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">System &amp; Jurisdiction</div>
              <div className="font-semibold text-slate-900">
                {systemTypeLabel(data.system.type)}{data.system.zone ? ` — ${data.system.zone}` : ""}
              </div>
              {data.system.description && <div className="text-slate-600">{data.system.description}</div>}
              <div className="mt-1 text-slate-500">Jurisdiction: {data.jurisdiction.name}</div>
              <div className="text-slate-500">NFPA 25: {data.jurisdiction.nfpa25_edition}</div>
              {data.jurisdiction.local_code_ref && (
                <div className="text-slate-500">Local code: {data.jurisdiction.local_code_ref}</div>
              )}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Visual Timeline */}
          <div className="animate-fade-in stagger-2">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timeline</div>
              <div className="text-xs text-slate-500 font-medium">Total duration: {data.duration_str}</div>
            </div>
            <VisualTimeline points={timelinePoints} />
          </div>

          <hr className="border-slate-200" />

          {/* Compliance Checklist */}
          <div className="animate-fade-in stagger-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Compliance Check
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-100">
              {data.compliance_items.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 text-sm px-4 py-3 border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-slate-50 transition-colors duration-100`}>
                  <ComplianceIcon status={item.status} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${item.status === "missing" ? "text-red-800" : "text-slate-800"}`}>
                        {item.label}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap font-medium">{item.condition}</div>
                </div>
              ))}
            </div>

            {data.compliance_violations.length > 0 && (
              <div className="mt-4 bg-red-50/80 border border-red-200/60 rounded-2xl p-4">
                <div className="text-sm font-bold text-red-800 mb-1.5 uppercase tracking-wide">Active Violations:</div>
                {data.compliance_violations.map((v, i) => (
                  <div key={i} className="text-sm text-red-700 flex items-start gap-1.5 mt-1">
                    <span className="font-bold flex-shrink-0">&#10007;</span>
                    {v.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Event Log */}
          <div className="animate-fade-in stagger-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Event Log — Immutable Audit Trail ({data.events.length} entries)
            </div>
            <div className="space-y-2">
              {data.events.map(e => (
                <EventLogEntry key={e.id} event={e} />
              ))}
            </div>
          </div>

          {/* Add Note — only for active impairments */}
          {data.status !== "closed" && data.status !== "closed_incomplete" && (
            <>
              <hr className="border-slate-200" />
              <div className="no-print">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Add Note to Record
                </div>
                {noteError && (
                  <div className="mb-2 text-xs text-red-600">{noteError}</div>
                )}
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white/80 backdrop-blur resize-none"
                  rows={2}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Note text (appears in the event log)..."
                />
                <div className="flex gap-3 items-center">
                  <input
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white/80"
                    value={noteBy}
                    onChange={e => setNoteBy(e.target.value)}
                    placeholder="Your name"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={noteSubmitting}
                    className="px-5 py-2.5 bg-slate-700 text-white rounded-xl text-sm hover:bg-slate-800 font-semibold disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
                  >
                    {noteSubmitting ? "Saving..." : "Add Note"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-400 flex justify-between">
            <span>Generated by ImpairmentOS &nbsp;&middot;&nbsp; {formatDateTime(data.generated_at)}</span>
            <span className="font-mono">{data.impairment_number}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
