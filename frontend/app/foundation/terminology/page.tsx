import Link from "next/link";

type MappingRecord = {
  id: string;
  sourceCode: string;
  sourceSystem: string;
  targetCode: string;
  targetSystem: string;
  displayName: string;
  status: string;
};

type TerminologyPayload = {
  mappings: MappingRecord[];
  stats: {
    totalMappings: number;
    activeMappings: number;
    systemsMapped: number;
  };
};

async function getTerminologyData(): Promise<TerminologyPayload> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/foundation/terminology/", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch terminology mappings");
    }
    return res.json();
  } catch (error) {
    console.error("Terminology load error:", error);
    return {
      mappings: [],
      stats: { totalMappings: 0, activeMappings: 0, systemsMapped: 0 }
    };
  }
}

export const dynamic = "force-dynamic";

export default async function TerminologyPage() {
  const data = await getTerminologyData();

  return (
    <section className="terminology-page">
      <nav className="facility-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="separator">/</span>
        <span className="current">Foundation</span>
        <span className="separator">/</span>
        <span className="current">Terminology Mapping</span>
      </nav>

      <header className="page-header">
        <div>
          <div className="eyebrow">Enterprise HIE Services</div>
          <h1>Clinical Terminology Registry</h1>
          <p className="muted">
            Translate local electronic health record identifiers and LIS test names to standardized LOINC, RxNorm, and ICD-10 systems.
          </p>
        </div>
      </header>

      <section className="grid cols-3">
        <div className="panel stat">
          <span className="muted">Total Mappings</span>
          <span className="stat-value">{data.stats.totalMappings}</span>
          <span className="status success">Active maps</span>
        </div>
        <div className="panel stat">
          <span className="muted">Active Translation Rules</span>
          <span className="stat-value">{data.stats.activeMappings}</span>
          <span className="muted">Reconciliation ready</span>
        </div>
        <div className="panel stat">
          <span className="muted">Standard Vocabularies</span>
          <span className="stat-value">{data.stats.systemsMapped}</span>
          <span className="muted">LOINC, RxNorm, ICD-10-CM</span>
        </div>
      </section>

      <div className="mpi-card">
        <div className="mpi-table-wrap">
          <table className="mpi-table">
            <thead>
              <tr>
                <th>Map ID</th>
                <th>Source Code</th>
                <th>Source System</th>
                <th>Target Code</th>
                <th>Standard System</th>
                <th>Display Name</th>
                <th>Translation Status</th>
              </tr>
            </thead>
            <tbody>
              {data.mappings.map((map) => (
                <tr key={map.id}>
                  <td>
                    <strong>#{map.id}</strong>
                  </td>
                  <td>
                    <code style={{ background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                      {map.sourceCode}
                    </code>
                  </td>
                  <td>{map.sourceSystem}</td>
                  <td>
                    <code style={{ background: "var(--accent-tint)", color: "var(--accent)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                      {map.targetCode}
                    </code>
                  </td>
                  <td>
                    <strong>{map.targetSystem}</strong>
                  </td>
                  <td>{map.displayName}</td>
                  <td>
                    <span className="mpi-action-pill verify">
                      {map.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.mappings.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="patient-empty-state">
                      <strong>No terminology maps defined</strong>
                      <p>Ensure the core backend is running and returning mapped clinical concepts.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
