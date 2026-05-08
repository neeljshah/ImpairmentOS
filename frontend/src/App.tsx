import { useState, useEffect } from "react";
import { api } from "./api";
import type { Impairment } from "./api";
import { Dashboard } from "./components/Dashboard";
import { NavBar } from "./components/NavBar";
import { NewImpairmentWizard } from "./components/NewImpairmentWizard";
import { ImpairmentPacket } from "./components/ImpairmentPacket";
import { ExportModal } from "./components/ExportModal";
import { RecordsExport } from "./components/RecordsExport";
import { PropertyOverview } from "./components/PropertyOverview";
import { DeficiencyTracker } from "./components/DeficiencyTracker";
import { Walkthrough } from "./components/Walkthrough";
import "./index.css";

type View =
  | { type: "dashboard"; filterPropertyId?: number }
  | { type: "properties" }
  | { type: "deficiencies" }
  | { type: "walkthrough" }
  | { type: "new_impairment" }
  | { type: "take_action"; impairment: Impairment }
  | { type: "packet"; impairmentId: number }
  | { type: "packet_after_close"; impairmentId: number }
  | { type: "export"; propertyId: number; startDate: string; endDate: string };

export default function App() {
  const [view, setView] = useState<View>({ type: "dashboard" });
  const [dashboardKey, setDashboardKey] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPrefillPropertyId, setExportPrefillPropertyId] = useState<number | undefined>(undefined);
  const [cedarImpairment, setCedarImpairment] = useState<Impairment | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  // Load Cedar Heights broken impairment for walkthrough + update tab title
  useEffect(() => {
    api.getDashboard().then(data => {
      const cedar = data.active_impairments.find(i =>
        i.system.property.name.includes("Cedar Heights") && i.status === "repair_in_progress"
      );
      if (cedar) setCedarImpairment(cedar);
      setActiveCount(data.active_impairments.length);
      setAlertCount(data.compliance_alerts.length);
    }).catch(() => {});
  }, [dashboardKey]);

  useEffect(() => {
    const parts: string[] = [];
    if (alertCount > 0) parts.push(`${alertCount} alerts`);
    if (activeCount > 0) parts.push(`${activeCount} active`);
    document.title = parts.length > 0
      ? `(${parts.join(", ")}) ImpairmentOS`
      : "ImpairmentOS";
  }, [activeCount, alertCount]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.altKey && e.key === "d") { e.preventDefault(); setView({ type: "dashboard" }); }
      if (e.altKey && e.key === "p") { e.preventDefault(); setView({ type: "properties" }); }
      if (e.altKey && e.key === "f") { e.preventDefault(); setView({ type: "deficiencies" }); }
      if (e.altKey && e.key === "n") { e.preventDefault(); setView({ type: "new_impairment" }); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function refreshDashboard() {
    setDashboardKey(k => k + 1);
  }

  function openExportModal(propertyId?: number) {
    setExportPrefillPropertyId(propertyId);
    setShowExportModal(true);
  }

  async function handleResetDemo() {
    if (!window.confirm("Reset all data to the Cedar Heights demo scenario? This cannot be undone.")) return;
    try {
      await api.resetDemo();
      refreshDashboard();
      setView({ type: "dashboard" });
    } catch {
      alert("Reset failed — check backend is running.");
    }
  }

  const navBar = (activeView?: string) => (
    <NavBar
      onNewImpairment={["dashboard", "properties", "deficiencies"].includes(activeView || "") ? () => setView({ type: "new_impairment" }) : undefined}
      onExportRecords={["dashboard", "properties", "deficiencies"].includes(activeView || "") ? () => openExportModal() : undefined}
      onViewProperties={() => setView({ type: "properties" })}
      onViewDeficiencies={() => setView({ type: "deficiencies" })}
      onStartWalkthrough={() => setView({ type: "walkthrough" })}
      onResetDemo={handleResetDemo}
      onHome={() => { refreshDashboard(); setView({ type: "dashboard" }); }}
      activeView={activeView}
    />
  );

  if (view.type === "walkthrough") {
    return (
      <div className="min-h-screen bg-slate-50">
        {navBar("walkthrough")}
        <Walkthrough
          cedarImpairment={cedarImpairment}
          onViewWizard={(imp) => setView({ type: "take_action", impairment: imp })}
          onViewPacket={(id) => setView({ type: "packet", impairmentId: id })}
          onBack={() => setView({ type: "dashboard" })}
          onReset={() => { refreshDashboard(); setView({ type: "dashboard" }); }}
        />
      </div>
    );
  }

  if (view.type === "new_impairment") {
    return (
      <div className="min-h-screen bg-slate-50">
        {navBar()}
        <NewImpairmentWizard
          onCancel={() => setView({ type: "dashboard" })}
          onDone={(imp) => {
            refreshDashboard();
            setView({ type: "packet_after_close", impairmentId: imp.id });
          }}
        />
      </div>
    );
  }

  if (view.type === "take_action") {
    return (
      <div className="min-h-screen bg-slate-50">
        {navBar()}
        <NewImpairmentWizard
          prefillImpairment={view.impairment}
          onCancel={() => { refreshDashboard(); setView({ type: "dashboard" }); }}
          onDone={(imp) => {
            refreshDashboard();
            setView({ type: "packet_after_close", impairmentId: imp.id });
          }}
        />
      </div>
    );
  }

  if (view.type === "packet" || view.type === "packet_after_close") {
    return (
      <div className="min-h-screen bg-slate-50">
        {navBar()}
        {view.type === "packet_after_close" && (
          <div className="max-w-3xl mx-auto pt-4 px-6">
            <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-green-800 font-semibold">
              ✓ Impairment closed. Impairment Packet generated below.
            </div>
          </div>
        )}
        <ImpairmentPacket
          impairmentId={view.impairmentId}
          onBack={() => { refreshDashboard(); setView({ type: "dashboard" }); }}
        />
      </div>
    );
  }

  if (view.type === "export") {
    return (
      <div className="min-h-screen bg-slate-50">
        {navBar()}
        <RecordsExport
          propertyId={view.propertyId}
          startDate={view.startDate}
          endDate={view.endDate}
          onBack={() => setView({ type: "dashboard" })}
        />
      </div>
    );
  }

  if (view.type === "deficiencies") {
    return (
      <div className="min-h-screen bg-slate-50">
        {showExportModal && (
          <ExportModal
            prefillPropertyId={exportPrefillPropertyId}
            onClose={() => setShowExportModal(false)}
            onGenerate={(propertyId, startDate, endDate) => {
              setShowExportModal(false);
              setView({ type: "export", propertyId, startDate, endDate });
            }}
          />
        )}
        {navBar("deficiencies")}
        <DeficiencyTracker
          onBack={() => setView({ type: "dashboard" })}
        />
      </div>
    );
  }

  if (view.type === "properties") {
    return (
      <div className="min-h-screen bg-slate-50">
        {showExportModal && (
          <ExportModal
            prefillPropertyId={exportPrefillPropertyId}
            onClose={() => setShowExportModal(false)}
            onGenerate={(propertyId, startDate, endDate) => {
              setShowExportModal(false);
              setView({ type: "export", propertyId, startDate, endDate });
            }}
          />
        )}
        {navBar("properties")}
        <PropertyOverview
          onFilterDashboard={(propertyId) => {
            refreshDashboard();
            setView({ type: "dashboard", filterPropertyId: propertyId });
          }}
          onExportRecords={(propertyId) => openExportModal(propertyId)}
        />
      </div>
    );
  }

  // Dashboard (default)
  return (
    <div className="min-h-screen bg-slate-50">
      {showExportModal && (
        <ExportModal
          prefillPropertyId={exportPrefillPropertyId}
          onClose={() => setShowExportModal(false)}
          onGenerate={(propertyId, startDate, endDate) => {
            setShowExportModal(false);
            setView({ type: "export", propertyId, startDate, endDate });
          }}
        />
      )}
      {navBar("dashboard")}
      <Dashboard
        key={dashboardKey}
        filterPropertyId={view.type === "dashboard" ? view.filterPropertyId : undefined}
        onViewPacket={(id) => setView({ type: "packet", impairmentId: id })}
        onTakeAction={(imp) => setView({ type: "take_action", impairment: imp })}
      />
    </div>
  );
}
