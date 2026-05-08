export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function durationHours(start: string, end?: string | null): number {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  return (e - s) / 3600000;
}

export function durationStr(start: string, end?: string | null): string {
  const h = durationHours(start, end);
  const hrs = Math.floor(h);
  const mins = Math.floor((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

export function systemTypeLabel(t: string): string {
  const map: Record<string, string> = {
    wet_sprinkler: "Wet Sprinkler",
    dry_sprinkler: "Dry Sprinkler",
    standpipe: "Standpipe",
    fire_pump: "Fire Pump",
    fire_alarm: "Fire Alarm",
    fire_door: "Fire Door",
    kitchen_suppression: "Kitchen Suppression",
    emergency_lighting: "Emergency Lighting",
  };
  return map[t] || t;
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    open: "Open",
    fire_watch_active: "Fire Watch Active",
    repair_in_progress: "Repair In Progress",
    restoration_testing: "Restoration Testing",
    pending_closure: "Pending Closure",
    closed: "Closed",
    closed_incomplete: "Closed (Incomplete)",
  };
  return map[s] || s;
}

export function statusColor(s: string): string {
  if (s === "closed") return "bg-green-100 text-green-800";
  if (s === "closed_incomplete") return "bg-yellow-100 text-yellow-800";
  if (s === "open") return "bg-red-100 text-red-800";
  return "bg-orange-100 text-orange-800";
}

export function eventTypeLabel(t: string): string {
  const map: Record<string, string> = {
    created: "Impairment Opened",
    ahj_notified: "AHJ Notified",
    fire_watch_started: "Fire Watch Started",
    fire_watch_ended: "Fire Watch Ended",
    repair_started: "Repair Started",
    repair_completed: "System Restored",
    restoration_test_recorded: "Main Drain Test Recorded",
    closure_requested: "Closure Requested",
    closed: "Impairment Closed",
    closed_incomplete: "Closed — Incomplete",
    note_added: "Note Added",
    escalation_triggered: "Escalation Triggered",
  };
  return map[t] || t;
}
