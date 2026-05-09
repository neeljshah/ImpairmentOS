import { useEffect, useState } from "react";
import { api } from "../api";
import type { DashboardData, Impairment, ComplianceAlert } from "../api";
import { formatDateTime, durationStr, statusLabel, statusColor, systemTypeLabel } from "../utils";

interface Violation {
  type: "ahj" | "main_drain";
  message: string;
  overdueLabel: string;
  overdueSeconds: number;
}

function computeViolations(imp: Impairment): Violation[] {
  const jur = imp.system.property.jurisdiction;
  const openedAt = imp.opened_at.endsWith("Z") || imp.opened_at.includes("+") ? imp.opened_at : imp.opened_at + "Z";
  const durH = (Date.now() - new Date(openedAt).getTime()) / 3600000;
  const violations: Violation[] = [];

  if (jur.ahj_notification_required && !imp.ahj_notified && durH > jur.notification_threshold_hours) {
    const overdueS = (durH - jur.notification_threshold_hours) * 3600;
    const overdueH = overdueS / 3600;
    const overdueLabel = overdueH >= 24
      ? `overdue by ${Math.floor(overdueH / 24)}d ${Math.floor(overdueH % 24)}h`
      : overdueH >= 1
        ? `overdue by ${Math.floor(overdueH)}h ${Math.floor((overdueH % 1) * 60)}m`
        : `overdue by ${Math.floor(overdueH * 60)}m`;
    violations.push({
      type: "ahj",
      message: `AHJ notification required (${jur.local_code_ref || jur.name})`,
      overdueLabel,
      overdueSeconds: overdueS,
    });
  }

  const restoredOrLong = imp.restored_at != null || durH > 4;
  if (jur.main_drain_on_restore && !imp.main_drain_test_performed && restoredOrLong && durH > 4) {
    violations.push({
      type: "main_drain",
      message: "Main drain test required (NFPA 25 §13.2.5, >4h)",
      overdueLabel: "NOT RECORDED",
      overdueSeconds: 0,
    });
  }

  return violations;
}

function LiveElapsed({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s2 = since.endsWith("Z") || since.includes("+") ? since : since + "Z";
  const ms = now - new Date(s2).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${String(m).padStart(2, "0")}m`);
  parts.push(`${String(s).padStart(2, "0")}s`);
  return <span className="font-mono tabular-nums">{parts.join(" ")}</span>;
}

interface Props {
  onViewPacket: (id: number) => void;
  onTakeAction: (imp: Impairment) => void;
  filterPropertyId?: number | null;
}

function avgDuration(imps: Impairment[]): string {
  const closed = imps.filter(i => i.closed_at != null);
  if (closed.length === 0) return "—";
  const parse = (s: string) => new Date(s.endsWith("Z") ? s : s + "Z");
  const totalMs = closed.reduce((sum, i) => {
    return sum + parse(i.closed_at!).getTime() - parse(i.opened_at).getTime();
  }, 0);
  const avgMs = totalMs / closed.length;
  const h = Math.floor(avgMs / 3600000);
  const m = Math.floor((avgMs % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: "red" | "amber" | "green" | "slate";
}) {
  const borderColor = { red: "border-red-500", amber: "border-amber-500", green: "border-green-500", slate: "border-slate-300" }[accent];
  const valueColor = { red: "text-red-600", amber: "text-amber-600", green: "text-green-600", slate: "text-slate-500" }[accent];
  return (
    <div className={`bg-white rounded-lg border-l-4 ${borderColor} px-5 py-4 shadow-sm`}>
      <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-sm font-semibold text-slate-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function AlertBanner({ alerts }: { alerts: ComplianceAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-600 font-bold text-sm">⚠ COMPLIANCE ALERTS ({alerts.length})</span>
      </div>
      <ul className="space-y-1">
        {alerts.map((a, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-red-800">
            <span className="mt-0.5 text-red-500">&#9632;</span>
            <span>
              <strong>{a.property_name}</strong>: {a.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComplianceStatusRow({ imp }: { imp: Impairment }) {
  const jur = imp.system.property.jurisdiction;
  const dur = durationStr(imp.opened_at, imp.closed_at ?? undefined);
  const durH = imp.closed_at
    ? (new Date(imp.closed_at).getTime() - new Date(imp.opened_at).getTime()) / 3600000
    : (Date.now() - new Date(imp.opened_at).getTime()) / 3600000;

  const items = [];

  const ahjNeeded = jur.ahj_notification_required && durH > jur.notification_threshold_hours;
  if (ahjNeeded || jur.ahj_notification_required) {
    if (imp.ahj_notified) {
      items.push(
        <span key="ahj" className="flex items-center gap-1 text-green-700">
          <CheckIcon /> AHJ Notified: {imp.ahj_notified_at ? new Date(imp.ahj_notified_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
          {imp.ahj_notification_ref ? ` (${imp.ahj_notification_ref})` : ""}
        </span>
      );
    } else {
      items.push(
        <span key="ahj" className="flex items-center gap-1 text-red-700 font-semibold">
          <XIcon /> AHJ NOT NOTIFIED (required by {jur.local_code_ref || "jurisdiction rules"})
        </span>
      );
    }
  }

  if (imp.fire_watch_started_at) {
    const fw = `${imp.fire_watch_assigned_to || "?"} ${
      new Date(imp.fire_watch_started_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    }–${imp.fire_watch_ended_at ? new Date(imp.fire_watch_ended_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "ONGOING"}`;
    items.push(
      <span key="fw" className={`flex items-center gap-1 ${imp.fire_watch_ended_at ? "text-green-700" : "text-amber-700"}`}>
        <CheckIcon /> Fire Watch: {fw}
      </span>
    );
  } else {
    items.push(
      <span key="fw" className="flex items-center gap-1 text-amber-700">
        <DashIcon /> Fire Watch: Not recorded
      </span>
    );
  }

  if (durH > 4) {
    if (imp.main_drain_test_performed) {
      items.push(
        <span key="drain" className="flex items-center gap-1 text-green-700">
          <CheckIcon /> Main Drain: {imp.main_drain_psi_static}/{imp.main_drain_psi_residual} PSI —{" "}
          {imp.main_drain_test_pass ? "PASS" : "FAIL"}
        </span>
      );
    } else {
      items.push(
        <span key="drain" className="flex items-center gap-1 text-red-700 font-semibold">
          <XIcon /> Main Drain Test: NOT RECORDED
        </span>
      );
    }
  }

  return (
    <div className="text-xs mt-2 space-y-0.5 pl-2 border-l-2 border-slate-300">
      {items}
      <span className="text-slate-500">Duration: {dur}</span>
    </div>
  );
}

function CheckIcon() {
  return <span className="text-green-600 font-bold">&#10003;</span>;
}
function XIcon() {
  return <span className="text-red-600 font-bold">&#10007;</span>;
}
function DashIcon() {
  return <span className="text-slate-400">&#8211;</span>;
}

function JurisdictionChip({ jur }: { jur: Impairment["system"]["property"]["jurisdiction"] }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-600">
      <span className="font-mono font-bold">NFPA {jur.nfpa25_edition}</span>
      <span className="text-slate-400">|</span>
      <span>{jur.name}</span>
      {jur.notification_threshold_hours === 0 ? (
        <span className="text-red-600 font-bold ml-0.5">ALL impairments require AHJ</span>
      ) : (
        <span className="text-amber-700 font-semibold ml-0.5">AHJ &gt; {jur.notification_threshold_hours}h</span>
      )}
    </div>
  );
}

function ActiveCard({ imp, onTakeAction, onViewPacket }: { imp: Impairment; onTakeAction: (i: Impairment) => void; onViewPacket: (id: number) => void }) {
  const jur = imp.system.property.jurisdiction;
  const violations = computeViolations(imp);
  const isBlocked = violations.length > 0;
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteConfirm, setNoteConfirm] = useState("");

  async function saveNote() {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      let tech = "";
      try { tech = localStorage.getItem("impairmentos_last_tech") || ""; } catch {}
      await api.addNote(imp.id, { note: noteText.trim(), performed_by: tech || "Field Tech" });
      setNoteConfirm("Note saved");
      setNoteText("");
      setShowNote(false);
      setTimeout(() => setNoteConfirm(""), 3000);
    } catch {
      setNoteConfirm("Failed to save note");
    } finally {
      setNoteSaving(false);
    }
  }

  const ahjCompliant = jur.ahj_notification_required && imp.ahj_notified && imp.ahj_notified_at;
  const ahjNotifiedMinutes = ahjCompliant && imp.ahj_notified_at
    ? Math.round((new Date(imp.ahj_notified_at).getTime() - new Date(imp.opened_at).getTime()) / 60000)
    : null;

  return (
    <div className={`rounded-lg border overflow-hidden shadow-sm ${isBlocked ? "border-red-300" : "border-amber-300"}`}>
      <div className={`h-1 ${isBlocked ? "bg-red-500" : "bg-amber-500"}`} />
      <div className={`p-4 ${isBlocked ? "bg-red-50" : "bg-amber-50"}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-slate-900">
              {imp.system.property.name} — {imp.system.zone || systemTypeLabel(imp.system.system_type)}
            </div>
            <div className="text-sm text-slate-600 mt-0.5">{imp.reason}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Opened: {formatDateTime(imp.opened_at)} by {imp.opened_by}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-700 font-semibold">
                Elapsed: <LiveElapsed since={imp.opened_at} />
              </span>
            </div>
            <div className="mt-1.5">
              <JurisdictionChip jur={jur} />
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(imp.status)}`}>
            {statusLabel(imp.status)}
          </span>
        </div>

        {isBlocked && (
          <div className="mt-3 mb-1">
            <div className="bg-red-700 text-white px-3 py-1.5 rounded font-bold text-sm inline-flex items-center gap-2">
              <span>&#9608;&#9608;</span>
              BLOCKED: Cannot close — {violations.length} violation{violations.length > 1 ? "s" : ""}
              <span>&#9608;&#9608;</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {violations.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800 font-semibold bg-white/60 rounded px-2 py-1.5 border border-red-200">
                  <span className="text-red-600 mt-0.5 flex-shrink-0">&#10007;</span>
                  <div className="flex-1">
                    <div>{v.message}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-red-600 font-mono text-xs">{v.overdueLabel}</span>
                      <button
                        onClick={() => onTakeAction(imp)}
                        className="text-xs underline text-red-700 hover:text-red-900 font-bold"
                      >
                        Fix now →
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isBlocked && ahjCompliant && ahjNotifiedMinutes !== null && (
          <div className="mt-2 text-sm text-green-700 font-semibold flex items-center gap-1">
            <CheckIcon /> AHJ notified within {ahjNotifiedMinutes} min — {jur.local_code_ref || "jurisdiction deadline"}
          </div>
        )}

        <ComplianceStatusRow imp={imp} />

        {(() => {
          const nextAction = (() => {
            if (!imp.ahj_notified && jur.ahj_notification_required)
              return { label: "Notify AHJ →", cls: "bg-red-600 text-white hover:bg-red-700" };
            if (!imp.fire_watch_started_at)
              return { label: "Start Fire Watch →", cls: "bg-amber-600 text-white hover:bg-amber-700" };
            if (!imp.restored_at)
              return { label: "Record Restoration →", cls: "bg-slate-700 text-white hover:bg-slate-800" };
            return { label: "Complete & Close →", cls: "bg-green-600 text-white hover:bg-green-700" };
          })();
          return (
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <button
            onClick={() => onTakeAction(imp)}
            className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-colors ${nextAction.cls}`}
          >
            {nextAction.label}
          </button>
          <button
            onClick={() => onViewPacket(imp.id)}
            className="px-3 py-1.5 text-xs border border-slate-400 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            View Packet
          </button>
          <button
            onClick={() => setShowNote(v => !v)}
            className="px-3 py-1.5 text-xs border border-slate-300 text-slate-500 rounded-md hover:bg-slate-50 transition-colors"
          >
            + Note
          </button>
          {noteConfirm && (
            <span className="text-xs text-green-700 font-semibold">{noteConfirm}</span>
          )}
        </div>
          );
        })()}

        {showNote && (
          <div className="mt-2 flex gap-2 items-start">
            <textarea
              autoFocus
              className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
              rows={2}
              placeholder="Log an observation, status update, or action taken..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote(); }}
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={saveNote}
                disabled={noteSaving || !noteText.trim()}
                className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-40 font-semibold"
              >
                {noteSaving ? "..." : "Save"}
              </button>
              <button
                onClick={() => { setShowNote(false); setNoteText(""); }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClosedCard({ imp, onViewPacket }: { imp: Impairment; onViewPacket: (id: number) => void }) {
  const isIncomplete = imp.status === "closed_incomplete";
  return (
    <div className={`rounded-lg border overflow-hidden shadow-sm ${isIncomplete ? "border-yellow-300" : "border-slate-200 bg-white"}`}>
      <div className={`h-1 ${isIncomplete ? "bg-yellow-400" : "bg-green-500"}`} />
      <div className={`p-4 ${isIncomplete ? "bg-yellow-50" : "bg-white"}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-slate-900">
              {imp.system.property.name} — {imp.system.zone || systemTypeLabel(imp.system.system_type)}
            </div>
            <div className="text-sm text-slate-500">
              Duration: {durationStr(imp.opened_at, imp.closed_at ?? undefined)}
              {isIncomplete ? " · Closed without full compliance" : " · All steps complete"}
            </div>
            {isIncomplete && imp.closure_notes && (
              <div className="text-xs text-yellow-800 mt-0.5 italic">{imp.closure_notes}</div>
            )}
            <div className="text-xs text-slate-400 mt-0.5">
              Closed: {formatDateTime(imp.closed_at)} by {imp.closed_by || "—"}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(imp.status)}`}>
            {statusLabel(imp.status)}
          </span>
        </div>
        <div className="mt-3">
          <button
            onClick={() => onViewPacket(imp.id)}
            className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            View Audit Packet →
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
      <div className="px-6 py-5 flex items-start gap-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center text-sm flex-shrink-0">
              🔥
            </div>
            <h2 className="text-lg font-bold text-white">Welcome to ImpairmentOS</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            The impairment management workflow that produces audit-ready records the moment a fire protection system goes offline.
            Every jurisdiction's rules enforced. Every step timestamped. Every packet complete before it leaves the truck.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Jurisdiction-aware compliance enforcement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Real-time state machine guards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Audit-ready packets on close</span>
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 text-sm flex-shrink-0 mt-1"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function Dashboard({ onViewPacket, onTakeAction, filterPropertyId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">(
    filterPropertyId ?? "all"
  );
  const [showHero, setShowHero] = useState(() => {
    try { return localStorage.getItem("impairmentos_hero_dismissed") !== "1"; }
    catch { return true; }
  });

  function dismissHero() {
    setShowHero(false);
    try { localStorage.setItem("impairmentos_hero_dismissed", "1"); }
    catch {}
  }

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api.getDashboard()
      .then(d => { setData(d); setLastRefresh(new Date()); })
      .catch(e => { if (!silent) setError(String(e)); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-6 py-16 text-center text-slate-500">
      Loading dashboard...
    </div>
  );
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {showHero && <HeroBanner onDismiss={dismissHero} />}
      {/* Stat cards */}
      {(() => {
        const blockedCount = data.active_impairments.filter(i => computeViolations(i).length > 0).length;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
            <StatCard
              label="Active Impairments"
              value={data.active_impairments.length}
              sub={data.active_impairments.length > 0 ? "requires action" : "all clear"}
              accent={data.active_impairments.length > 0 ? "red" : "slate"}
            />
            <StatCard
              label="Blocked Closures"
              value={blockedCount}
              sub="compliance violations"
              accent={blockedCount > 0 ? "red" : "slate"}
            />
            <StatCard
              label="Compliance Alerts"
              value={data.compliance_alerts.length}
              sub={data.compliance_alerts.length > 0 ? "immediate action" : "no violations"}
              accent={data.compliance_alerts.length > 0 ? "amber" : "slate"}
            />
            <StatCard
              label="Closed (90 days)"
              value={data.recently_closed.length}
              sub="with audit packets"
              accent="green"
            />
            <StatCard
              label="Avg Resolution"
              value={avgDuration(data.recently_closed)}
              sub="mean closure time"
              accent="slate"
            />
          </div>
        );
      })()}

      {/* Property filter + refresh */}
      {(() => {
        const allProps = Array.from(
          new Map(
            [...data.active_impairments, ...data.recently_closed]
              .map(i => [i.system.property.id, i.system.property.name])
          ).entries()
        );
        const filteredActive = selectedPropertyId === "all"
          ? data.active_impairments
          : data.active_impairments.filter(i => i.system.property.id === selectedPropertyId);
        const filteredClosed = selectedPropertyId === "all"
          ? data.recently_closed
          : data.recently_closed.filter(i => i.system.property.id === selectedPropertyId);
        const filteredAlerts = selectedPropertyId === "all"
          ? data.compliance_alerts
          : data.compliance_alerts.filter(a => {
              const imp = data.active_impairments.find(i => i.id === a.impairment_id);
              return imp?.system.property.id === selectedPropertyId;
            });

        return (
          <>
            <div className="flex items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Filter:</label>
                <select
                  value={selectedPropertyId}
                  onChange={e => setSelectedPropertyId(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="text-xs border border-slate-300 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="all">All Properties</option>
                  {allProps.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                {selectedPropertyId !== "all" && (
                  <button
                    onClick={() => setSelectedPropertyId("all")}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {lastRefresh && (
                  <span className="text-[10px] text-slate-400">
                    Auto-refreshes every 30s
                  </span>
                )}
                <button
                  onClick={() => load()}
                  className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
                >
                  ↺ Refresh
                </button>
              </div>
            </div>

            <AlertBanner alerts={filteredAlerts} />

            <section className="mb-8">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                Active Impairments ({filteredActive.length})
              </h2>
              {filteredActive.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
                  <div className="text-2xl mb-2">✓</div>
                  <div className="text-slate-400 text-sm">No active impairments</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActive.map(imp => (
                    <ActiveCard key={imp.id} imp={imp} onTakeAction={onTakeAction} onViewPacket={onViewPacket} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                Recently Closed — Last 90 Days ({filteredClosed.length})
              </h2>
              {filteredClosed.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">
                  No recently closed impairments
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClosed.map(imp => (
                    <ClosedCard key={imp.id} imp={imp} onViewPacket={onViewPacket} />
                  ))}
                </div>
              )}
            </section>
          </>
        );
      })()}
    </div>
  );
}
