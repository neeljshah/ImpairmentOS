const BASE = "http://localhost:8001";

export interface Jurisdiction {
  id: number;
  name: string;
  state: string;
  nfpa25_edition: string;
  ahj_notification_required: boolean;
  notification_threshold_hours: number;
  fire_watch_required: boolean;
  main_drain_on_restore: boolean;
  ahj_contact_name: string | null;
  ahj_contact_phone: string | null;
  ahj_contact_email: string | null;
  local_code_ref: string | null;
}

export interface Property {
  id: number;
  name: string;
  address: string;
  jurisdiction_id: number;
  jurisdiction: Jurisdiction;
  owner_entity: string | null;
  property_manager: string | null;
  carrier_name: string | null;
  systems: SystemSummary[];
}

export interface SystemSummary {
  id: number;
  system_type: string;
  zone: string | null;
  description: string | null;
}

export interface ImpairmentEvent {
  id: number;
  impairment_id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  performed_by: string;
  performed_at: string;
  notes: string | null;
  metadata_json: string | null;
}

export interface ImpairmentSystem {
  id: number;
  property_id: number;
  system_type: string;
  zone: string | null;
  description: string | null;
  property: {
    id: number;
    name: string;
    address: string;
    jurisdiction_id: number;
    jurisdiction: Jurisdiction;
    owner_entity: string | null;
    property_manager: string | null;
    carrier_name: string | null;
  };
}

export interface Impairment {
  id: number;
  system_id: number;
  status: string;
  reason: string;
  opened_at: string;
  opened_by: string;
  estimated_duration_hours: number | null;
  gps_lat: number | null;
  gps_lon: number | null;
  ahj_notified: boolean;
  ahj_notified_at: string | null;
  ahj_notification_method: string | null;
  ahj_notification_ref: string | null;
  ahj_notification_required: boolean | null;
  fire_watch_assigned_to: string | null;
  fire_watch_organization: string | null;
  fire_watch_started_at: string | null;
  fire_watch_ended_at: string | null;
  fire_watch_hours_computed: number | null;
  restored_at: string | null;
  restored_by: string | null;
  restoration_notes: string | null;
  main_drain_test_performed: boolean;
  main_drain_psi_static: number | null;
  main_drain_psi_residual: number | null;
  main_drain_psi_differential: number | null;
  main_drain_test_pass: boolean | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  created_at: string;
  system: ImpairmentSystem;
  events: ImpairmentEvent[];
}

export interface ComplianceAlert {
  impairment_id: number;
  property_name: string;
  system_description: string;
  alert_type: string;
  message: string;
  severity: string;
}

export interface DashboardData {
  active_impairments: Impairment[];
  recently_closed: Impairment[];
  compliance_alerts: ComplianceAlert[];
}

export interface PacketData {
  impairment_number: string;
  generated_at: string;
  status: string;
  property: {
    name: string;
    address: string;
    owner_entity: string | null;
    property_manager: string | null;
    carrier_name: string | null;
    carrier_account: string | null;
  };
  system: { type: string; zone: string | null; description: string | null };
  jurisdiction: {
    name: string;
    nfpa25_edition: string;
    local_code_ref: string | null;
    ahj_contact: string | null;
  };
  timeline: {
    opened_at: string;
    opened_by: string;
    reason: string;
    ahj_notified_at: string | null;
    fire_watch_started_at: string | null;
    fire_watch_ended_at: string | null;
    restored_at: string | null;
    closed_at: string | null;
  };
  duration_str: string;
  duration_hours: number;
  compliance_items: {
    label: string;
    required: boolean;
    condition: string;
    status: string;
    detail: string;
  }[];
  compliance_violations: { type: string; message: string; severity: string; blocks_closure: boolean }[];
  all_compliant: boolean;
  events: {
    id: number;
    event_type: string;
    performed_by: string;
    performed_at: string;
    notes: string | null;
    from_status: string | null;
    to_status: string | null;
  }[];
  impairment: {
    id: number;
    ahj_notified: boolean;
    ahj_notification_method: string | null;
    ahj_notification_ref: string | null;
    fire_watch_assigned_to: string | null;
    fire_watch_organization: string | null;
    fire_watch_hours_computed: number | null;
    restored_by: string | null;
    restoration_notes: string | null;
    main_drain_test_performed: boolean;
    main_drain_psi_static: number | null;
    main_drain_psi_residual: number | null;
    main_drain_psi_differential: number | null;
    main_drain_test_pass: boolean | null;
    closed_by: string | null;
    closure_notes: string | null;
  };
}

export interface Deficiency {
  id: number;
  property_id: number;
  system_id: number | null;
  system_type: string | null;
  system_zone: string | null;
  reported_by: string;
  reported_at: string;
  description: string;
  severity: "critical" | "non_critical";
  status: "open" | "proposal_sent" | "customer_declined" | "repair_scheduled" | "resolved";
  proposal_sent_at: string | null;
  proposal_response: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  nfpa_reference: string | null;
  notes: string | null;
  on_itm_report: boolean;
  days_open: number;
}

export interface ExportData {
  property: {
    name: string;
    address: string;
    owner_entity: string | null;
    property_manager: string | null;
    carrier_name: string | null;
    carrier_account: string | null;
  };
  jurisdiction: {
    name: string;
    nfpa25_edition: string;
    local_code_ref: string | null;
    ahj_contact_name: string | null;
    ahj_contact_phone: string | null;
    ahj_contact_email: string | null;
  };
  date_range: { start: string; end: string };
  summary: {
    total_impairments: number;
    closed: number;
    open: number;
    closed_incomplete: number;
    avg_duration_hours: number;
    compliance_rate: number;
  };
  impairments: { packet: PacketData }[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw err;
  }
  return res.json();
}

export const api = {
  getDashboard: () => apiFetch<DashboardData>("/dashboard"),
  getProperties: () => apiFetch<Property[]>("/properties"),
  getJurisdictions: () => apiFetch<Jurisdiction[]>("/jurisdictions"),
  getImpairment: (id: number) => apiFetch<Impairment>(`/impairments/${id}`),
  getPacket: (id: number) => apiFetch<PacketData>(`/impairments/${id}/packet`),
  getCompliance: (id: number) => apiFetch<any>(`/impairments/${id}/compliance`),

  createImpairment: (data: {
    system_id: number;
    reason: string;
    opened_by: string;
    estimated_duration_hours?: number;
    gps_lat?: number;
    gps_lon?: number;
  }) => apiFetch<Impairment>("/impairments", { method: "POST", body: JSON.stringify(data) }),

  notifyAHJ: (id: number, data: {
    method: string;
    ref?: string;
    notified_by: string;
  }) => apiFetch<Impairment>(`/impairments/${id}/notify-ahj`, { method: "POST", body: JSON.stringify(data) }),

  startFireWatch: (id: number, data: {
    assigned_to: string;
    organization?: string;
    performed_by: string;
  }) => apiFetch<Impairment>(`/impairments/${id}/fire-watch`, { method: "POST", body: JSON.stringify(data) }),

  endFireWatch: (id: number, data: { performed_by: string }) =>
    apiFetch<Impairment>(`/impairments/${id}/fire-watch/end`, { method: "POST", body: JSON.stringify(data) }),

  restore: (id: number, data: {
    restored_by: string;
    restoration_notes?: string;
  }) => apiFetch<Impairment>(`/impairments/${id}/restore`, { method: "POST", body: JSON.stringify(data) }),

  recordTest: (id: number, data: {
    psi_static: number;
    psi_residual: number;
    performed_by: string;
  }) => apiFetch<Impairment>(`/impairments/${id}/test`, { method: "POST", body: JSON.stringify(data) }),

  close: (id: number, data: { closed_by: string; closure_notes?: string }) =>
    apiFetch<Impairment>(`/impairments/${id}/close`, { method: "POST", body: JSON.stringify(data) }),

  addNote: (id: number, data: { note: string; performed_by: string }) =>
    apiFetch<Impairment>(`/impairments/${id}/note`, { method: "POST", body: JSON.stringify(data) }),

  getExport: (propertyId: number, startDate: string, endDate: string) =>
    apiFetch<ExportData>(`/properties/${propertyId}/export?start_date=${startDate}&end_date=${endDate}`),

  getPropertyOverview: () => apiFetch<any[]>("/properties/overview"),

  getPropertyDeficiencies: (propertyId: number) =>
    apiFetch<Deficiency[]>(`/properties/${propertyId}/deficiencies`),

  resetDemo: () =>
    apiFetch<{ status: string; message: string }>("/demo/reset", { method: "POST" }),
};
