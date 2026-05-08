import { useState } from "react";
import { api } from "../api";
import type { Impairment } from "../api";

interface Props {
  cedarImpairment: Impairment | null;
  onViewWizard: (imp: Impairment) => void;
  onViewPacket: (id: number) => void;
  onBack: () => void;
  onReset: () => void;
}

const TOTAL_STEPS = 6;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < step ? "bg-amber-500" : i === step ? "bg-amber-300" : "bg-slate-200"
          }`}
        />
      ))}
      <span className="text-xs text-slate-500 font-mono whitespace-nowrap">{step + 1} / {TOTAL_STEPS}</span>
    </div>
  );
}

function StepWrapper({ title, subtitle, children, onNext, onPrev, nextLabel, step }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext?: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  step: number;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <ProgressBar step={step} />
      <div className="mb-4">
        <div className="text-xs font-bold text-amber-600 uppercase tracking-widest">Step {step + 1}</div>
        <h2 className="text-2xl font-bold text-slate-900 mt-1">{title}</h2>
        {subtitle && <p className="text-slate-600 mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="mb-6">{children}</div>
      <div className="flex items-center gap-3">
        {onPrev && (
          <button
            onClick={onPrev}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            ← Back
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="px-6 py-2.5 text-sm bg-amber-500 text-slate-900 rounded-lg font-bold hover:bg-amber-400 transition-colors shadow-sm"
          >
            {nextLabel || "Continue →"}
          </button>
        )}
      </div>
    </div>
  );
}

function NotebookPage() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 font-mono text-sm leading-relaxed shadow-inner">
      <div className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-4 not-italic">
        Field Log — M. DiSalvo — Beacon Fire &amp; Safety
      </div>
      <div className="space-y-3 text-slate-700">
        <div>
          <span className="font-bold text-slate-900">Jan 12, 07:40</span>
          {" "}— Cedar Heights 9th fl. Frozen pipe at riser. Shut off valve, called crew.
        </div>
        <div>
          <span className="font-bold text-slate-900">08:00</span>
          {" "}— Fire watch started. Carlos Rivera on.
          <span className="ml-2 text-red-700 font-bold not-italic">[✗ no AHJ call — "rule is 4hrs"]</span>
        </div>
        <div>
          <span className="font-bold text-slate-900">08:15</span>
          {" "}— Ordered 6ft pipe section. Crew started work.
        </div>
        <div>
          <span className="font-bold text-slate-900">13:30</span>
          {" "}— Pipe in. System pressurized. Fire watch called off. Done main drain check — pressure good.
          <span className="ml-2 text-red-700 font-bold not-italic">[✗ no formal record, no PSI logged]</span>
        </div>
        <div className="border-t border-amber-200 pt-3 text-xs text-slate-500 italic">
          Linda's annotation (Day -74): "Was AHJ notified? Mike says under 4hrs — but Hartwell is all impairments. Need to check."
          <span className="ml-2 text-red-700 font-bold not-italic">[✗ never followed up]</span>
        </div>
        <div className="text-xs text-slate-500 italic">
          Tom's note (Day -62): "AHJ thing — let it sit. Mike handled it."
          <span className="ml-2 text-red-700 font-bold not-italic">[✗ no action taken]</span>
        </div>
      </div>
    </div>
  );
}

function ViolationsPreview() {
  return (
    <div className="rounded-lg border border-red-300 overflow-hidden shadow-sm">
      <div className="h-1 bg-red-500" />
      <div className="p-4 bg-red-50">
        <div className="font-semibold text-slate-900">Cedar Heights Apartments — 9th Floor Zone</div>
        <div className="text-sm text-slate-600 mt-0.5">Frozen pipe at vertical riser</div>
        <div className="text-xs text-slate-500 mt-0.5">Opened: Jan 12, 2026 · 116 days ago</div>

        <div className="mt-3 mb-1">
          <div className="bg-red-700 text-white px-3 py-1.5 rounded font-bold text-sm inline-block">
            &#9608;&#9608; BLOCKED: Cannot close — 2 violations &#9608;&#9608;
          </div>
          <ul className="mt-2 space-y-1">
            <li className="flex items-start gap-1 text-sm text-red-800 font-semibold">
              <span className="text-red-600 mt-0.5">&#10007;</span>
              <span>AHJ notification required (Hartwell Fire Code §17-4.7) — <span className="text-red-600">overdue by 116 days</span></span>
            </li>
            <li className="flex items-start gap-1 text-sm text-red-800 font-semibold">
              <span className="text-red-600 mt-0.5">&#10007;</span>
              <span>Main drain test required (NFPA 25 §13.2.5, &gt;4h) — <span className="text-red-600">NOT RECORDED</span></span>
            </li>
          </ul>
        </div>

        <div className="flex gap-2 mt-3">
          <div className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md font-semibold opacity-60 cursor-not-allowed">
            Notify AHJ
          </div>
          <div className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-md opacity-60 cursor-not-allowed">
            Take Action
          </div>
        </div>
      </div>
    </div>
  );
}

export function Walkthrough({ cedarImpairment, onViewWizard, onViewPacket, onBack, onReset }: Props) {
  const [step, setStep] = useState(0);
  const [resetting, setResetting] = useState(false);

  async function handleFinish() {
    setResetting(true);
    try {
      await api.resetDemo();
      onReset();
    } finally {
      setResetting(false);
    }
  }

  if (step === 0) {
    return (
      <StepWrapper
        step={0}
        title="The Situation"
        subtitle="January 12, 2026. Mike DiSalvo responds to a frozen pipe at Cedar Heights Apartments. 116 days later, Beacon Fire & Safety is facing litigation."
        onPrev={onBack}
        onNext={() => setStep(1)}
        nextLabel="See What Went Wrong →"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Duration", value: "5h 50m", color: "text-red-600" },
              { label: "AHJ Notified", value: "Never", color: "text-red-600" },
              { label: "Main Drain Test", value: "Unrecorded", color: "text-red-600" },
            ].map((s, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
            <strong>What happened:</strong> Mike knew the 4-hour rule from Wessex. Hartwell requires notification for <em>all</em> impairments, regardless of duration. He recorded a main drain test in his notes, but never submitted formal PSI readings. The state machine saw neither as complete.
          </div>
        </div>
      </StepWrapper>
    );
  }

  if (step === 1) {
    return (
      <StepWrapper
        step={1}
        title="The Notebook"
        subtitle="This is how Beacon tracked impairments before ImpairmentOS. A field log with handwritten notes, personal interpretations, and no enforcement."
        onPrev={() => setStep(0)}
        onNext={() => setStep(2)}
        nextLabel="See How ImpairmentOS Handles This →"
      >
        <NotebookPage />
      </StepWrapper>
    );
  }

  if (step === 2) {
    return (
      <StepWrapper
        step={2}
        title="With ImpairmentOS"
        subtitle="The same impairment — but now the system sees what the notebook missed."
        onPrev={() => setStep(1)}
        onNext={() => setStep(3)}
        nextLabel="Try to Close It →"
      >
        <div className="space-y-3">
          <ViolationsPreview />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <strong>What you're seeing:</strong> The BLOCKED badge isn't cosmetic. The state machine checks Hartwell's rules against the impairment data. AHJ notification was required at time zero. Main drain test required for any impairment over 4 hours. Both missing — closure is blocked.
          </div>
        </div>
      </StepWrapper>
    );
  }

  if (step === 3) {
    return (
      <StepWrapper
        step={3}
        title="Enforcement in Action"
        subtitle="Click 'Take Action' on the Cedar Heights impairment and try to close it. The system won't let you."
        onPrev={() => setStep(2)}
        onNext={() => setStep(4)}
        nextLabel="Now Fix It →"
      >
        <div className="space-y-3">
          <div className="bg-slate-900 text-white rounded-lg p-4 text-sm font-mono">
            <div className="text-amber-400 text-xs mb-2">// What happens when you skip step 3 and go to Close:</div>
            <div className="text-red-400">ERROR: Cannot transition from repair_in_progress → closed</div>
            <div className="text-slate-400 mt-1">Reason: 2 compliance violations block closure</div>
            <div className="text-slate-400">  - ahj_notification: required, not recorded</div>
            <div className="text-slate-400">  - main_drain_test: required (duration &gt; 4h), not recorded</div>
          </div>
          {cedarImpairment && (
            <button
              onClick={() => onViewWizard(cedarImpairment)}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Open Cedar Heights Wizard — Try to Close Without Fixing →
            </button>
          )}
          <div className="text-xs text-slate-500 italic text-center">
            "This is the moment that would have saved Beacon $50,000+ in legal fees."
          </div>
        </div>
      </StepWrapper>
    );
  }

  if (step === 4) {
    return (
      <StepWrapper
        step={4}
        title="The Compliant Path"
        subtitle="Now fix it. Notify the AHJ, record the drain test, then close. Three steps. Under 3 minutes."
        onPrev={() => setStep(3)}
        onNext={() => setStep(5)}
        nextLabel="See the Result →"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            {[
              { num: 1, label: "Notify AHJ", detail: "Call Marshal Reyes. Record method + reference number.", icon: "📞" },
              { num: 2, label: "Record Main Drain Test", detail: "Enter static and residual PSI. System calculates differential.", icon: "💧" },
              { num: 3, label: "Close Impairment", detail: "Violations cleared. State machine allows transition.", icon: "✓" },
            ].map(s => (
              <div key={s.num} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3">
                <div className="w-7 h-7 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {s.num}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{s.icon} {s.label}</div>
                  <div className="text-xs text-slate-500">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
          {cedarImpairment && (
            <button
              onClick={() => onViewWizard(cedarImpairment)}
              className="w-full px-4 py-3 bg-amber-500 text-slate-900 rounded-lg font-bold hover:bg-amber-400 transition-colors"
            >
              Walk Through the Fix →
            </button>
          )}
        </div>
      </StepWrapper>
    );
  }

  if (step === 5) {
    return (
      <StepWrapper
        step={5}
        title="The Impairment Packet"
        subtitle="Once closed, ImpairmentOS generates a complete audit packet — the document that answers every demand from Halberd, Reyes, Continental Mutual, and Worth Patel."
        onPrev={() => setStep(4)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { who: "Robert Halberd (Owner)", wants: "Every inspection report for Cedar Heights — 3 years on a thumb drive by Friday." },
              { who: "Marshal Elena Reyes (AHJ)", wants: "3 years of ITM records within 30 days." },
              { who: "Continental Mutual (Carrier)", wants: "Full documentation for claims investigation." },
              { who: "Worth Patel (Attorney)", wants: "19 specific documents under preservation hold." },
            ].map((r, i) => (
              <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="font-semibold text-slate-800 text-xs">{r.who}</div>
                <div className="text-xs text-slate-600 mt-0.5 italic">"{r.wants}"</div>
                <div className="text-xs text-green-700 font-bold mt-1">→ One export. Under 60 seconds.</div>
              </div>
            ))}
          </div>
          {cedarImpairment && (
            <button
              onClick={() => onViewPacket(cedarImpairment.id)}
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
            >
              View Audit Packet →
            </button>
          )}
          <button
            onClick={handleFinish}
            disabled={resetting}
            className="w-full px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {resetting ? "Resetting demo…" : "↺ Reset Demo Data & Return to Dashboard"}
          </button>
        </div>
      </StepWrapper>
    );
  }

  return null;
}
