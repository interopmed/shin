"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mergePatientMpi, MpiConflictRecord } from "../lib/patients-db";

type IdentityConflictQueueProps = {
  initialConflicts: MpiConflictRecord[];
};

export default function IdentityConflictQueue({ initialConflicts }: IdentityConflictQueueProps) {
  const router = useRouter();
  const [conflicts, setConflicts] = useState<MpiConflictRecord[]>(initialConflicts);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [activeCompareConflict, setActiveCompareConflict] = useState<MpiConflictRecord | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  const handleOpenCompare = (conflict: MpiConflictRecord) => {
    setActiveCompareConflict(conflict);
    setActiveDropdownId(null);
    if (conflict.patients && conflict.patients.length > 0) {
      setSelectedMasterId(conflict.patients[0].id);
    }
  };

  const handleDismissLocal = (id: string) => {
    setConflicts(prev => prev.filter(c => c.id !== id));
    setActiveDropdownId(null);
  };

  const handleAutoMerge = async (conflict: MpiConflictRecord) => {
    if (!conflict.patients || conflict.patients.length < 2) return;
    setIsSubmitting(true);
    try {
      // Find the latest patient based on lastVisit
      const sorted = [...conflict.patients].sort((a, b) => {
        return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      });
      const keep = sorted[0];
      const deletes = sorted.slice(1).map(p => p.id);

      const success = await mergePatientMpi(keep.id, deletes);
      if (success) {
        setConflicts(prev => prev.filter(c => c.id !== conflict.id));
        router.refresh();
      }
    } catch (err) {
      console.error("Auto merge failed:", err);
    } finally {
      setIsSubmitting(false);
      setActiveDropdownId(null);
    }
  };

  const handleManualMerge = async () => {
    if (!activeCompareConflict || !selectedMasterId || isSubmitting) return;
    if (!activeCompareConflict.patients) return;

    setIsSubmitting(true);
    try {
      const deleteIds = activeCompareConflict.patients
        .map(p => p.id)
        .filter(id => id !== selectedMasterId);

      const success = await mergePatientMpi(selectedMasterId, deleteIds);
      if (success) {
        setConflicts(prev => prev.filter(c => c.id !== activeCompareConflict.id));
        setActiveCompareConflict(null);
        router.refresh();
      }
    } catch (err) {
      console.error("Manual merge failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mpi-panel" id="merge-status" style={{ position: "relative" }}>
      <h2>Identity Conflict Queue</h2>
      <div className="mpi-conflict-list">
        {conflicts.length ? (
          conflicts.map((item) => (
            <div
              className="mpi-conflict-item"
              key={item.id}
              style={{ position: "relative", overflow: "visible" }}
            >
              <span className={`mpi-conflict-icon ${item.tone}`}>!</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.time}</p>
              </div>

              {/* Action Dots */}
              <div style={{ position: "relative" }}>
                <button
                  className="mpi-row-menu"
                  aria-label={`More actions for ${item.title}`}
                  type="button"
                  onClick={(e) => toggleDropdown(item.id, e)}
                  style={{
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    border: "none",
                    background: activeDropdownId === item.id ? "#f1f5f9" : "transparent",
                    color: "#475569"
                  }}
                >
                  ⋮
                </button>

                {/* Dropdown Menu */}
                {activeDropdownId === item.id && (
                  <>
                    <div
                      style={{
                        position: "fixed",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 90,
                        background: "transparent"
                      }}
                      onClick={() => setActiveDropdownId(null)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "100%",
                        marginTop: "4px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                        width: "180px",
                        zIndex: 100,
                        overflow: "hidden"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenCompare(item)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 14px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#1e293b",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        🔎 Review & Compare
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoMerge(item)}
                        disabled={isSubmitting}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 14px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#0d9488",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdfa")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        ⚡ Auto-Merge (Keep Latest)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismissLocal(item.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 14px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#ef4444",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          borderTop: "1px solid #f1f5f9",
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        Dismiss Conflict
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="mpi-conflict-item">
            <span className="mpi-conflict-icon info">i</span>
            <div>
              <strong>No duplicate clusters found</strong>
              <p>The current database snapshot is clean.</p>
            </div>
          </div>
        )}
      </div>

      {/* Compare & Merge Side-by-Side Modal */}
      {activeCompareConflict && activeCompareConflict.patients && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 200,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              width: "100%",
              maxWidth: "850px",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  Compare Duplicate Profiles
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Select the master profile to keep. All other profiles in this conflict cluster will be merged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCompareConflict(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#64748b",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            </div>

            {/* Compare Content */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", gap: "16px" }}>
                {activeCompareConflict.patients.map((patient, index) => {
                  const isMaster = selectedMasterId === patient.id;
                  return (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedMasterId(patient.id)}
                      style={{
                        flex: 1,
                        border: isMaster ? "2px solid #0d9488" : "1px solid #cbd5e1",
                        borderRadius: "12px",
                        padding: "18px",
                        background: isMaster ? "#f0fdfa" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        position: "relative"
                      }}
                    >
                      {/* Checkbox indicator */}
                      <div
                        style={{
                          position: "absolute",
                          right: "16px",
                          top: "16px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: isMaster ? "6px solid #0d9488" : "2px solid #94a3b8",
                          background: "#ffffff",
                          transition: "all 0.15s"
                        }}
                      />

                      <div style={{ paddingRight: "28px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: isMaster ? "#0d9488" : "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em"
                          }}
                        >
                          Profile Candidate {index + 1}
                        </span>
                        <h4 style={{ margin: "4px 0 12px", fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                          {patient.name}
                        </h4>
                      </div>

                      <div style={{ display: "grid", gap: "10px", fontSize: "13px" }}>
                        <div>
                          <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>Unique ID</span>
                          <strong style={{ color: "#1e293b" }}>{patient.patientNumber}</strong>
                        </div>
                        <div>
                          <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>Gender</span>
                          <span style={{ color: "#1e293b", fontWeight: 550 }}>{patient.sex}</span>
                        </div>
                        <div>
                          <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>Date of Birth</span>
                          <span style={{ color: "#1e293b", fontWeight: 550 }}>{patient.birthDate}</span>
                        </div>
                        <div>
                          <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>Address</span>
                          <span style={{ color: "#1e293b", fontWeight: 550 }}>{patient.address}</span>
                        </div>
                        <div>
                          <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>Contact Info</span>
                          <span style={{ color: "#1e293b", fontSize: "12px", fontWeight: 550 }}>
                            📞 {patient.phone} <br /> ✉️ {patient.email}
                          </span>
                        </div>
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px" }}>
                          <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>Last Updated</span>
                          <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 550 }}>{patient.lastVisit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "end",
                gap: "12px"
              }}
            >
              <button
                type="button"
                onClick={() => setActiveCompareConflict(null)}
                disabled={isSubmitting}
                className="mpi-filter-button"
                style={{
                  minHeight: "36px",
                  height: "36px",
                  padding: "0 16px",
                  borderRadius: "8px",
                  background: "#ffffff",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualMerge}
                disabled={isSubmitting || !selectedMasterId}
                className="mpi-primary-button"
                style={{
                  minHeight: "36px",
                  height: "36px",
                  padding: "0 20px",
                  borderRadius: "8px",
                  background: isSubmitting ? "#0f766e" : "#0d9488",
                  borderColor: "#0f766e",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {isSubmitting ? "Merging..." : "Confirm & Merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
