import { useEffect, useState } from "react";
import { api } from "../api";
import type { Property, Impairment } from "../api";
import { systemTypeLabel } from "../utils";

interface Props {
  onDone: (imp: Impairment) => void;
  onCancel: () => void;
  prefillImpairment?: Impairment | null;
}

type Step =
  | "select_property"
  | "describe"
  | "open"
  | "ahj"
  | "fire_watch"
  | "restore_test"
  | "close";

const STEP_LABELS: Record<Step, string> = {
  select_property: "1/7 — Select Property & System",
  describe: "2/7 — Describe Impairment",
  open: "3/7 — Open Impairment",
  ahj: "4/7 — AHJ Notification",
  fire_watch: "5/7 — Fire Watch",
  restore_test: "6/7 — Restoration & Testing",
  close: "7/7 — Close & Generate Packet",
};

const STEPS: Step[] = ["select_property", "describe", "open", "ahj", "fire_watch", "restore_test", "close"];

const QUICK_REASONS = [
  "Frozen pipe at vertical riser",
  "Control valve repair",
  "Fire pump service",
  "Sprinkler head replacement",
  "System pressure loss — investigating",
  "Planned maintenance shutdown",
  "Other",
];

export function NewImpairmentWizard({ onDone, onCancel, prefillImpairment }: Props) {
  const [step, setStep] = useState<Step>("select_property");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "">("");
  const [selectedSystemId, setSelectedSystemId] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [openedBy, setOpenedBy] = useState("");
  const [impairment, setImpairment] = useState<Impairment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AHJ step state
  const [ahjMethod, setAhjMethod] = useState("phone");
  const [ahjRef, setAhjRef] = useState("");
  const [ahjBy, setAhjBy] = useState("");
  const [skipAhj, setSkipAhj] = useState(false);

  // Fire watch step state
  const [fwName, setFwName] = useState("");
  const [fwOrg, setFwOrg] = useState("");
  const [fwBy, setFwBy] = useState("");
  const [skipFireWatch, setSkipFireWatch] = useState(false);

  // Restore & test step state
  const [restoredBy, setRestoredBy] = useState("");
  const [restorationNotes, setRestorationNotes] = useState("");
  const [endFwBy, setEndFwBy] = useState("");
  const [psiStatic, setPsiStatic] = useState("");
  const [psiResidual, setPsiResidual] = useState("");
  const [testBy, setTestBy] = useState("");
  const [skipDrain, setSkipDrain] = useState(false);

  // Close step state
  const [closedBy, setClosedBy] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closeError, setCloseError] = useState<string[]>([]);

  useEffect(() => {
    api.getProperties().then(setProperties).catch(console.error);
  }, []);

  // If prefilling (take action on an existing impairment)
  useEffect(() => {
    if (prefillImpairment) {
      setImpairment(prefillImpairment);
      // Jump to the appropriate step
      const imp = prefillImpairment;
      if (imp.status === "closed" || imp.status === "closed_incomplete") {
        setStep("close");
      } else if (!imp.ahj_notified && imp.ahj_notification_required) {
        setStep("ahj");
      } else if (!imp.fire_watch_started_at) {
        setStep("fire_watch");
      } else if (!imp.restored_at) {
        setStep("restore_test");
      } else {
        setStep("close");
      }
    }
  }, [prefillImpairment]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const jur = selectedProperty?.jurisdiction || impairment?.system.property.jurisdiction;

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  async function handleOpen() {
    if (!selectedSystemId || !reason || !openedBy) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const imp = await api.createImpairment({
        system_id: Number(selectedSystemId),
        reason,
        opened_by: openedBy,
        estimated_duration_hours: estimatedHours ? Number(estimatedHours) : undefined,
        gps_lat: 42.3601,
        gps_lon: -71.0589,
      });
      setImpairment(imp);
      setStep("ahj");
    } catch (e: any) {
      setError(e?.detail || "Failed to open impairment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNotifyAHJ() {
    if (!impairment) return;
    if (skipAhj) {
      setStep("fire_watch");
      return;
    }
    if (!ahjBy) { setError("Enter who performed the notification."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api.notifyAHJ(impairment.id, {
        method: ahjMethod,
        ref: ahjRef || undefined,
        notified_by: ahjBy,
      });
      setImpairment(updated);
      setStep("fire_watch");
    } catch (e: any) {
      setError(e?.detail || "Failed to record AHJ notification");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFireWatch() {
    if (!impairment) return;
    if (skipFireWatch) {
      setStep("restore_test");
      return;
    }
    if (!fwName || !fwBy) { setError("Enter fire watch assignee and performed-by."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api.startFireWatch(impairment.id, {
        assigned_to: fwName,
        organization: fwOrg || undefined,
        performed_by: fwBy,
      });
      setImpairment(updated);
      setStep("restore_test");
    } catch (e: any) {
      setError(e?.detail || "Failed to start fire watch");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestoreAndTest() {
    if (!impairment) return;
    if (!restoredBy) { setError("Enter who restored the system."); return; }
    setError(null);
    setSubmitting(true);
    try {
      // End fire watch if it's active (default performer to restoring tech)
      if (impairment.fire_watch_started_at && !impairment.fire_watch_ended_at) {
        await api.endFireWatch(impairment.id, { performed_by: endFwBy || restoredBy });
      }
      // Record restoration
      let updated = await api.restore(impairment.id, {
        restored_by: restoredBy,
        restoration_notes: restorationNotes || undefined,
      });
      // Record main drain test if provided
      if (!skipDrain && psiStatic && psiResidual) {
        updated = await api.recordTest(impairment.id, {
          psi_static: Number(psiStatic),
          psi_residual: Number(psiResidual),
          performed_by: testBy || restoredBy,
        });
      }
      setImpairment(updated);
      setStep("close");
    } catch (e: any) {
      setError(e?.detail || "Failed to record restoration");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    if (!impairment) return;
    if (!closedBy) { setCloseError(["Enter supervisor name for sign-off."]); return; }
    setCloseError([]);
    setSubmitting(true);
    try {
      const updated = await api.close(impairment.id, {
        closed_by: closedBy,
        closure_notes: closureNotes || undefined,
      });
      setImpairment(updated);
      onDone(updated);
    } catch (e: any) {
      if (e?.detail?.violations) {
        setCloseError(e.detail.violations);
      } else {
        setCloseError([e?.detail?.error || e?.detail || "Failed to close impairment"]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const ahjRequired = jur?.ahj_notification_required;
  const ahjThreshold = jur?.notification_threshold_hours ?? 0;
  const ahjLabel = ahjRequired
    ? ahjThreshold === 0
      ? "REQUIRED for all impairments"
      : `Required for impairments > ${ahjThreshold}h`
    : "Not required";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">
          {prefillImpairment ? "Complete Impairment" : "New Impairment"}
        </h1>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>

      {/* Context banner when acting on an existing impairment */}
      {prefillImpairment && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded text-sm">
          <span className="font-semibold text-amber-800">
            Acting on: {prefillImpairment.system.property.name} — {prefillImpairment.system.zone || prefillImpairment.system.system_type}
          </span>
          <span className="text-amber-700 ml-2">
            (opened {new Date(prefillImpairment.opened_at).toLocaleString()})
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-semibold text-slate-700">{STEP_LABELS[step]}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full">
          <div
            className="h-2 bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Step 1: Select Property ── */}
      {step === "select_property" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property</label>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              value={selectedPropertyId}
              onChange={e => { setSelectedPropertyId(Number(e.target.value)); setSelectedSystemId(""); }}
            >
              <option value="">Select property...</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {selectedProperty && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System</label>
                <select
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={selectedSystemId}
                  onChange={e => setSelectedSystemId(Number(e.target.value))}
                >
                  <option value="">Select system...</option>
                  {selectedProperty.systems.map(s => (
                    <option key={s.id} value={s.id}>
                      {systemTypeLabel(s.system_type)}{s.zone ? ` — ${s.zone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm">
                <div className="font-semibold text-slate-800 mb-1">Jurisdiction: {selectedProperty.jurisdiction.name}</div>
                <div className="text-slate-700">NFPA 25 Edition: {selectedProperty.jurisdiction.nfpa25_edition}</div>
                <div className="text-slate-700">
                  AHJ Notification: <strong>{ahjLabel}</strong>
                  {selectedProperty.jurisdiction.local_code_ref && (
                    <span className="ml-1 text-slate-500">({selectedProperty.jurisdiction.local_code_ref})</span>
                  )}
                </div>
                <div className="text-slate-700">
                  AHJ Contact: {selectedProperty.jurisdiction.ahj_contact_name || "—"}
                  {selectedProperty.jurisdiction.ahj_contact_phone && ` — ${selectedProperty.jurisdiction.ahj_contact_phone}`}
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!selectedSystemId) { setError("Select a property and system."); return; }
                setError(null);
                setStep("describe");
              }}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded text-sm hover:bg-amber-400 font-semibold"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Describe ── */}
      {step === "describe" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Description</label>
            <input
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the impairment..."
            />
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-2">Quick Select:</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    reason === r
                      ? "bg-amber-500 text-slate-900 border-amber-500 font-semibold"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Duration (hours)</label>
            <input
              type="number"
              className="w-32 border border-slate-300 rounded px-3 py-2 text-sm"
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value)}
              placeholder="e.g. 6"
            />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep("select_property")} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
              ← Back
            </button>
            <button
              onClick={() => {
                if (!reason) { setError("Enter a reason."); return; }
                setError(null);
                setStep("open");
              }}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded text-sm hover:bg-amber-400 font-semibold"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Open ── */}
      {step === "open" && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-green-600 font-bold">&#10003;</span>
              Timestamp: {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} (auto)
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-green-600 font-bold">&#10003;</span>
              GPS: 42.3601, -71.0589 (auto-stamped)
            </div>
          </div>

          {ahjRequired && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm">
              <div className="font-semibold text-amber-800 mb-0.5">AHJ NOTIFICATION REQUIRED</div>
              <div className="text-amber-700">
                {jur?.local_code_ref} requires {ahjThreshold === 0 ? "immediate" : `notification within ${ahjThreshold}h for`} notification for{" "}
                {ahjThreshold === 0 ? "all impairments" : "impairments exceeding threshold"}.
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opened By *</label>
            <input
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              value={openedBy}
              onChange={e => setOpenedBy(e.target.value)}
              placeholder="Technician name"
            />
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep("describe")} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
              ← Back
            </button>
            <button
              onClick={handleOpen}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-semibold disabled:opacity-50"
            >
              {submitting ? "Opening..." : "Open Impairment"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: AHJ Notification ── */}
      {step === "ahj" && impairment && (
        <div className="space-y-4">
          {ahjRequired ? (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm">
              <div className="font-semibold text-amber-800">Notification required by {jur?.local_code_ref}</div>
              <div className="text-amber-700 text-xs mt-0.5">
                Contact: {jur?.ahj_contact_name} — {jur?.ahj_contact_phone}
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
              AHJ notification not required for this jurisdiction (under threshold).
            </div>
          )}

          {!skipAhj && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notification Method</label>
                <div className="flex gap-3">
                  {["phone", "email", "in_person", "portal"].map(m => (
                    <label key={m} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="method"
                        value={m}
                        checked={ahjMethod === m}
                        onChange={() => setAhjMethod(m)}
                      />
                      {m.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Spoke to / Confirmation Ref</label>
                <input
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={ahjRef}
                  onChange={e => setAhjRef(e.target.value)}
                  placeholder="e.g. Spoke to Lt. Halloran, ref# AHJ-2026-0112"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notified By *</label>
                <input
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={ahjBy}
                  onChange={e => setAhjBy(e.target.value)}
                  placeholder="Technician who made the call"
                />
              </div>
            </>
          )}

          {!ahjRequired && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={skipAhj} onChange={e => setSkipAhj(e.target.checked)} />
              Skip AHJ notification (not required for this jurisdiction)
            </label>
          )}

          <div className="flex justify-between">
            <div />
            <button
              onClick={handleNotifyAHJ}
              disabled={submitting}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded text-sm hover:bg-amber-400 font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving..." : ahjRequired ? "Record Notification →" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Fire Watch ── */}
      {step === "fire_watch" && impairment && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            NFPA 25 §15.5.1 requires fire watch to be implemented immediately upon system impairment.
          </div>

          {!skipFireWatch && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To *</label>
                <input
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={fwName}
                  onChange={e => setFwName(e.target.value)}
                  placeholder="e.g. Carlos Rivera"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                <input
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={fwOrg}
                  onChange={e => setFwOrg(e.target.value)}
                  placeholder="e.g. Steeplechase Property Management"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recorded By *</label>
                <input
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={fwBy}
                  onChange={e => setFwBy(e.target.value)}
                  placeholder="Technician name"
                />
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={skipFireWatch} onChange={e => setSkipFireWatch(e.target.checked)} />
            Skip fire watch record (impairment was already restored before fire watch could be assigned)
          </label>
          {skipFireWatch && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
              Warning: skipping fire watch may create a compliance violation. This will be flagged in the audit packet.
            </div>
          )}

          <div className="flex justify-between">
            <div />
            <button
              onClick={handleFireWatch}
              disabled={submitting}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded text-sm hover:bg-amber-400 font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving..." : skipFireWatch ? "Skip & Continue →" : "Record Fire Watch →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 6: Restore & Test ── */}
      {step === "restore_test" && impairment && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">System Restored By *</label>
            <input
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              value={restoredBy}
              onChange={e => setRestoredBy(e.target.value)}
              placeholder="Technician name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Restoration Notes</label>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              rows={2}
              value={restorationNotes}
              onChange={e => setRestorationNotes(e.target.value)}
              placeholder="Describe work performed..."
            />
          </div>

          {impairment.fire_watch_started_at && !impairment.fire_watch_ended_at && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Fire Watch — Recorded By</label>
              <input
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                value={endFwBy}
                onChange={e => setEndFwBy(e.target.value)}
                placeholder="Fire watch personnel name"
              />
            </div>
          )}

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-700">Main Drain Test</div>
              <div className="text-xs text-slate-500">Required by NFPA 25 §13.2.5 after impairment &gt; 4 hours</div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
              <input type="checkbox" checked={skipDrain} onChange={e => setSkipDrain(e.target.checked)} />
              Skip main drain test (impairment under 4 hours)
            </label>
            {!skipDrain && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Static PSI</label>
                    <input
                      type="number"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      value={psiStatic}
                      onChange={e => setPsiStatic(e.target.value)}
                      placeholder="e.g. 85"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Residual PSI</label>
                    <input
                      type="number"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                      value={psiResidual}
                      onChange={e => setPsiResidual(e.target.value)}
                      placeholder="e.g. 78"
                    />
                  </div>
                </div>
                {psiStatic && psiResidual && (
                  <div className="text-sm bg-slate-50 rounded p-2">
                    Differential: <strong>{(Number(psiStatic) - Number(psiResidual)).toFixed(1)} PSI</strong>
                    <span className={`ml-2 font-semibold ${Number(psiStatic) - Number(psiResidual) <= 10 ? "text-green-700" : "text-red-700"}`}>
                      {Number(psiStatic) - Number(psiResidual) <= 10 ? "— PASS" : "— FAIL (exceeds 10 PSI)"}
                    </span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Test Performed By</label>
                  <input
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    value={testBy}
                    onChange={e => setTestBy(e.target.value)}
                    placeholder="Defaults to restoring technician"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <div />
            <button
              onClick={handleRestoreAndTest}
              disabled={submitting}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded text-sm hover:bg-amber-400 font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Record Restoration →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 7: Close ── */}
      {step === "close" && impairment && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm space-y-1.5">
            <div className="font-semibold text-slate-800 mb-2">Impairment Summary</div>
            <div><strong>Property:</strong> {impairment.system.property.name} — {impairment.system.zone}</div>
            <div><strong>Duration:</strong> {(() => {
              const h = (Date.now() - new Date(impairment.opened_at).getTime()) / 3600000;
              return `${Math.floor(h)}h ${Math.floor((h - Math.floor(h)) * 60)}m`;
            })()}</div>
            <div className={`flex items-center gap-1 ${impairment.ahj_notified ? "text-green-700" : "text-red-700 font-semibold"}`}>
              {impairment.ahj_notified ? (
                <><span>&#10003;</span> AHJ Notified: {impairment.ahj_notified_at ? new Date(impairment.ahj_notified_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""} ({impairment.ahj_notification_ref || "no ref"})</>
              ) : (
                <><span>&#10007;</span> AHJ NOT NOTIFIED</>
              )}
            </div>
            <div className={`flex items-center gap-1 ${impairment.fire_watch_started_at ? "text-green-700" : "text-orange-700"}`}>
              {impairment.fire_watch_started_at ? (
                <><span>&#10003;</span> Fire Watch: {impairment.fire_watch_assigned_to} {
                  impairment.fire_watch_started_at ? new Date(impairment.fire_watch_started_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""
                }–{impairment.fire_watch_ended_at ? new Date(impairment.fire_watch_ended_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "ONGOING"}</>
              ) : (
                <><span>&#8211;</span> Fire Watch: Not recorded</>
              )}
            </div>
            <div className={`flex items-center gap-1 ${impairment.main_drain_test_performed ? "text-green-700" : "text-orange-700"}`}>
              {impairment.main_drain_test_performed ? (
                <><span>&#10003;</span> Main Drain: {impairment.main_drain_psi_static}/{impairment.main_drain_psi_residual} PSI — {impairment.main_drain_test_pass ? "PASS" : "FAIL"}</>
              ) : (
                <><span>&#8211;</span> Main Drain Test: Not recorded</>
              )}
            </div>
          </div>

          {closeError.length > 0 && (
            <div className="bg-red-50 border border-red-400 rounded p-3">
              <div className="font-semibold text-red-800 mb-1 text-sm">Cannot close — compliance requirements not met:</div>
              {closeError.map((msg, i) => (
                <div key={i} className="text-sm text-red-700 flex items-start gap-1">
                  <span className="font-bold mt-0.5">&#10007;</span>
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Closed By (Supervisor Sign-off) *</label>
            <input
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              value={closedBy}
              onChange={e => setClosedBy(e.target.value)}
              placeholder="Supervisor name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Closure Notes</label>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              rows={2}
              value={closureNotes}
              onChange={e => setClosureNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-between">
            <div />
            <button
              onClick={handleClose}
              disabled={submitting}
              className="px-5 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-semibold disabled:opacity-50"
            >
              {submitting ? "Closing..." : "Close Impairment & Generate Packet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
