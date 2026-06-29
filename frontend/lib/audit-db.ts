export type AuditEventRecord = {
  id: string;
  timestamp: string;
  eventId: string;
  userId: string;
  action: string;
  objectType: string;
  sourceSystem: string;
  severity: string;
  traceId: string;
};

export type TopUserRecord = {
  userId: string;
  count: number;
};

export type AuditMetricsRecord = {
  totalEvents24h: number;
  anomalousAlertsCount: number;
  complianceDrift: number;
  topUsers: TopUserRecord[];
};

export type ThreatAlertRecord = {
  id: string;
  title: string;
  score: number;
  confidence: number;
  createdAt: string;
};

export type AuditEventsFilters = {
  userId?: string;
  action?: string;
  severity?: string;
  sourceSystem?: string;
  search?: string;
};

class BackendRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "BackendRequestError";
  }
}

function backendBaseUrl() {
  return (process.env.SHIN_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
}

function backendUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, `${backendBaseUrl()}/`).toString();
}

async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(backendUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Backend request failed for ${path}`;

    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string };
      message = parsed.detail || parsed.error || message;
    } catch {
      // Keep the raw response text.
    }

    throw new BackendRequestError(response.status, message);
  }

  return (await response.json()) as T;
}

export async function getAuditEvents(filters: AuditEventsFilters = {}): Promise<AuditEventRecord[]> {
  try {
    const params = new URLSearchParams();
    if (filters.userId) params.set("user_id", filters.userId);
    if (filters.action) params.set("action", filters.action);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.sourceSystem) params.set("source_system", filters.sourceSystem);
    if (filters.search) params.set("search", filters.search);

    const queryString = params.toString();
    const url = `/api/audit/events/${queryString ? `?${queryString}` : ""}`;
    const payload = await backendRequest<{ events: any[] }>(url);
    
    return (payload.events || []).map((row) => ({
      id: String(row.id),
      timestamp: row.timestamp,
      eventId: row.event_id,
      userId: row.user_id,
      action: row.action,
      objectType: row.object_type,
      sourceSystem: row.source_system,
      severity: row.severity,
      traceId: row.trace_id,
    }));
  } catch (error) {
    console.error("Error fetching audit events:", error);
    return [];
  }
}

export async function getAuditMetrics(): Promise<AuditMetricsRecord> {
  try {
    const payload = await backendRequest<any>("/api/audit/metrics/");
    return {
      totalEvents24h: Number(payload.total_events_24h ?? 0),
      anomalousAlertsCount: Number(payload.anomalous_alerts_count ?? 0),
      complianceDrift: Number(payload.compliance_drift ?? 0),
      topUsers: (payload.top_users || []).map((user: any) => ({
        userId: String(user.user_id),
        count: Number(user.count)
      }))
    };
  } catch (error) {
    console.error("Error fetching audit metrics:", error);
    return {
      totalEvents24h: 0,
      anomalousAlertsCount: 0,
      complianceDrift: 0,
      topUsers: []
    };
  }
}

export async function getThreatAlerts(): Promise<ThreatAlertRecord[]> {
  try {
    const payload = await backendRequest<{ alerts: any[] }>("/api/audit/alerts/");
    return (payload.alerts || []).map((row) => ({
      id: String(row.id),
      title: row.title,
      score: Number(row.score ?? 0),
      confidence: Number(row.confidence ?? 0),
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Error fetching threat alerts:", error);
    return [];
  }
}

export async function createAuditEvent(event: Omit<AuditEventRecord, "id" | "timestamp">): Promise<AuditEventRecord> {
  const payload = await backendRequest<any>("/api/audit/events/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_id: event.eventId,
      user_id: event.userId,
      action: event.action,
      object_type: event.objectType,
      source_system: event.sourceSystem,
      severity: event.severity,
      trace_id: event.traceId,
    }),
  });

  return {
    id: String(payload.id),
    timestamp: payload.timestamp,
    eventId: payload.event_id,
    userId: payload.user_id,
    action: payload.action,
    objectType: payload.object_type,
    sourceSystem: payload.source_system,
    severity: payload.severity,
    traceId: payload.trace_id,
  };
}

export async function updateAuditEvent(
  id: string,
  event: Partial<Omit<AuditEventRecord, "id" | "timestamp">>
): Promise<AuditEventRecord> {
  const payload = await backendRequest<any>(`/api/audit/events/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_id: event.eventId,
      user_id: event.userId,
      action: event.action,
      object_type: event.objectType,
      source_system: event.sourceSystem,
      severity: event.severity,
      trace_id: event.traceId,
    }),
  });

  return {
    id: String(payload.id),
    timestamp: payload.timestamp,
    eventId: payload.event_id,
    userId: payload.user_id,
    action: payload.action,
    objectType: payload.object_type,
    sourceSystem: payload.source_system,
    severity: payload.severity,
    traceId: payload.trace_id,
  };
}

export async function deleteAuditEvent(id: string): Promise<void> {
  await backendRequest<void>(`/api/audit/events/${id}/`, {
    method: "DELETE",
  });
}

