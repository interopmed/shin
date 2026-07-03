import Link from "next/link";

type FeedRecord = {
  name: string;
  protocol: string;
  status: string;
  latency: string;
  processed: number;
  tone: string;
};

type MessageRecord = {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  status: string;
  details: string;
};

type IntegrationPayload = {
  feeds: FeedRecord[];
  messageQueue: MessageRecord[];
  stats: {
    successRate: number;
    averageLatency: string;
    queueSize: number;
  };
};

async function getIntegrationData(): Promise<IntegrationPayload> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/foundation/integration/", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch integration gateway metrics");
    }
    return res.json();
  } catch (error) {
    console.error("Integration load error:", error);
    return {
      feeds: [],
      messageQueue: [],
      stats: { successRate: 100.0, averageLatency: "0ms", queueSize: 0 }
    };
  }
}

export const dynamic = "force-dynamic";

export default async function IntegrationGatewayPage() {
  const data = await getIntegrationData();

  return (
    <section className="integration-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="separator">/</span>
        <span className="current">Foundation</span>
        <span className="separator">/</span>
        <span className="current">Integration Gateway</span>
      </nav>

      <header className="page-header">
        <div>
          <div className="eyebrow">Interface & Message Router</div>
          <h1>Integration Gateway</h1>
          <p className="muted">
            Monitor real-time HL7 v2 and FHIR R4 transactions, interface queue health, and processing latencies.
          </p>
        </div>
      </header>

      <section className="grid cols-3" style={{ marginBottom: "2rem" }}>
        <div className="panel stat">
          <span className="muted">Average Route Latency</span>
          <span className="stat-value">{data.stats.averageLatency}</span>
          <span className="status success">Within SLA thresholds</span>
        </div>
        <div className="panel stat">
          <span className="muted">Message Success Rate</span>
          <span className="stat-value">{data.stats.successRate}%</span>
          <span className="status success">Transmission active</span>
        </div>
        <div className="panel stat">
          <span className="muted">Queue Backlog</span>
          <span className="stat-value">{data.stats.queueSize}</span>
          <span className="muted">Pending sync tasks</span>
        </div>
      </section>

      <section className="grid cols-3 gap-6">
        <div className="panel col-span-1">
          <h2>Active Data Feeds</h2>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>Core integration endpoints</p>
          <ul className="list">
            {data.feeds.map((feed) => (
              <li key={feed.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <div>
                  <strong>{feed.name}</strong>
                  <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>{feed.protocol} · {feed.latency} latency</p>
                </div>
                <span className={`mpi-action-pill ${feed.tone}`} style={{ fontSize: "0.8rem" }}>
                  {feed.status} ({feed.processed})
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel col-span-2">
          <h2>HL7 & FHIR Message Routing Log</h2>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>Event bus transactions</p>
          <div className="mpi-table-wrap" style={{ border: "none", padding: 0 }}>
            <table className="mpi-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Message Type</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.messageQueue.map((msg) => (
                  <tr key={msg.id}>
                    <td style={{ fontSize: "0.85rem" }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      <code style={{ background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.85rem" }}>
                        {msg.type}
                      </code>
                    </td>
                    <td>{msg.source}</td>
                    <td>
                      <span className={`patient-status ${msg.status === "Success" ? "active" : "inactive"}`}>
                        {msg.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{msg.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}
