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
    <section className="mpi-page">
      <div className="mpi-card">
        <header className="mpi-header">
          <div>
            <h1>Clinical Terminology Registry</h1>
            <p className="patient-db-status">
              Translate local electronic health record identifiers and LIS test names to standardized LOINC, RxNorm, and ICD-10 systems.
            </p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '0 24px 24px 24px', borderBottom: '1px solid #e3e9f1' }}>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Mappings</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>{data.stats.totalMappings}</div>
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              Active maps
            </span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Translation Rules</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>{data.stats.activeMappings}</div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>Reconciliation ready</span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard Vocabularies</span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>{data.stats.systemsMapped}</div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>LOINC, RxNorm, ICD-10-CM</span>
          </div>
        </div>

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
                    <code style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                      {map.sourceCode}
                    </code>
                  </td>
                  <td><span style={{ color: "#475569", fontWeight: "500" }}>{map.sourceSystem}</span></td>
                  <td>
                    <code style={{ background: "#eff6ff", color: "#2563eb", padding: "4px 8px", borderRadius: "6px", fontSize: "13px", fontWeight: "600" }}>
                      {map.targetCode}
                    </code>
                  </td>
                  <td>
                    <strong>{map.targetSystem}</strong>
                  </td>
                  <td><span style={{ color: "#0f172a", fontWeight: "500" }}>{map.displayName}</span></td>
                  <td>
                    <div className="mpi-confidence">
                      <strong style={{ color: map.status === "Active" ? "#059669" : "#64748b" }}>
                        {map.status}
                      </strong>
                    </div>
                  </td>
                </tr>
              ))}
              {data.mappings.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>No terminology maps defined</strong>
                      <p style={{ margin: 0, fontSize: '13px' }}>Ensure the core backend is running and returning mapped clinical concepts.</p>
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
