'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCareTeams, CareTeamRecord } from '@/lib/care-teams-db';

export default function CareTeamsPage() {
  const [careTeams, setCareTeams] = useState<CareTeamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCareTeams();
        setCareTeams(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  let content;
  if (loading) {
    content = (
      <div className="patient-list-footer" style={{ justifyContent: 'center', padding: '4rem' }}>
        <div className="lab-orders-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(102, 126, 234, 0.2)', borderRadius: '50%', borderTopColor: '#667eea', animation: 'spin 1s ease-in-out infinite' }} />
      </div>
    );
  } else if (careTeams.length === 0) {
    content = (
      <div style={{ padding: '24px' }}>
        <div className="patient-empty-state">
          <strong>No care teams found</strong>
          <p>There are no active care teams in the network.</p>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="patient-table-wrap">
        <table className="patient-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Risk Level</th>
              <th>Status</th>
              <th>Lead</th>
            </tr>
          </thead>
          <tbody>
            {careTeams.map((team) => (
              <tr key={team.id || team.name}>
                <td>
                  <strong className="patient-name-cell">{team.name}</strong>
                </td>
                <td>
                  <span className="patient-subtext">{team.risk}</span>
                </td>
                <td>
                  <span className={`patient-status ${team.status === 'Active' ? 'active' : ''}`} style={{ textTransform: 'capitalize' }}>
                    {team.status}
                  </span>
                </td>
                <td>
                  <span className="patient-phone">{team.leadName || 'Unassigned'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="patient-list-page">
      <div className="patient-list-card">
        <div className="patient-list-header">
          <div>
            <h1>Care Teams</h1>
            <p className="patient-subtext" style={{ marginTop: '4px' }}>
              {loading ? 'Loading…' : `${careTeams.length} care team${careTeams.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="patient-header-actions">
            <Link href="/care-teams/add" className="patient-primary-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Team
            </Link>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}
