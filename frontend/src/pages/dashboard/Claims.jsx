import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarRange, ChevronRight, Download, FileSearch, Search, ShieldAlert, X } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

const STATUS_FILTERS = ['All', 'Open', 'In review', 'Needs info', 'Approved', 'Denied', 'Closed', 'Paid'];

function getStatusClass(status) {
  return String(status || 'Unknown')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function getClaimWorkflow(claim, policyMap) {
  if (claim.workflowName) return claim.workflowName;
  if (claim.answers?.workflowName) return claim.answers.workflowName;
  if (policyMap.get(claim.policyId)?.useCase) return policyMap.get(claim.policyId).useCase;
  if (claim.incidentType) return claim.incidentType;
  return 'Unassigned workflow';
}

function getClaimEvidence(claim) {
  if (Array.isArray(claim.evidenceFiles) && claim.evidenceFiles.length > 0) return claim.evidenceFiles;
  if (Array.isArray(claim.answers?.evidenceFiles) && claim.answers.evidenceFiles.length > 0) {
    return claim.answers.evidenceFiles;
  }
  return [];
}

function buildTimeline(claim) {
  const events = [
    {
      id: 'submitted',
      title: 'Claim submitted',
      detail: `Claim ${claim.claimNumber || claim.id} was created.`,
      at: claim.createdAt,
    },
  ];

  const evidenceFiles = getClaimEvidence(claim);
  if (evidenceFiles.length > 0) {
    events.push({
      id: 'evidence',
      title: 'Evidence uploaded',
      detail: `${evidenceFiles.length} file(s) attached.`,
      at: claim.updatedAt || claim.createdAt,
    });
  }

  if (claim.status === 'Needs info') {
    events.push({
      id: 'needs-info',
      title: 'Additional information requested',
      detail: 'Rexy requested follow-up documents for underwriting review.',
      at: claim.updatedAt || claim.createdAt,
    });
  }

  if (['Approved', 'Paid', 'Closed'].includes(claim.status)) {
    events.push({
      id: 'approved',
      title: 'Coverage decision issued',
      detail: `Estimated reimbursement ${formatCurrency(
        claim.approvedPayout || claim.estimatedPayout || 0
      )}.`,
      at: claim.closedAt || claim.updatedAt || claim.createdAt,
    });
  }

  if (claim.status === 'Denied') {
    events.push({
      id: 'denied',
      title: 'Claim denied',
      detail: 'Review exclusions and ask Rexy for next-step guidance.',
      at: claim.updatedAt || claim.createdAt,
    });
  }

  return events
    .filter((event) => event.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

const Claims = () => {
  const { userClaims, userPolicies } = useAppData();
  const [searchParams] = useSearchParams();
  const createdClaimId = searchParams.get('created');
  const claimQueryId = searchParams.get('claim');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [policyFilter, setPolicyFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState(() => createdClaimId || claimQueryId || null);

  const policyMap = useMemo(
    () => new Map(userPolicies.map((policy) => [policy.id, policy])),
    [userPolicies]
  );
  const controlsDisabled = userClaims.length === 0;

  const createdMessage = useMemo(() => {
    if (!createdClaimId) return null;
    const createdClaim = userClaims.find((claim) => claim.id === createdClaimId);
    if (!createdClaim) return null;
    return `Claim ${createdClaim.claimNumber || createdClaim.id} submitted successfully. Rexy is now reviewing it.`;
  }, [createdClaimId, userClaims]);

  const filteredClaims = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return userClaims
      .filter((claim) => {
        if (statusFilter !== 'All' && claim.status !== statusFilter) return false;
        if (policyFilter !== 'all' && claim.policyId !== policyFilter) return false;

        const updated = claim.updatedAt || claim.createdAt;
        if (dateFrom && new Date(updated) < new Date(`${dateFrom}T00:00:00`)) return false;
        if (dateTo && new Date(updated) > new Date(`${dateTo}T23:59:59`)) return false;

        if (!query) return true;
        const haystack = [
          claim.claimNumber,
          claim.incidentType,
          claim.summary,
          claim.status,
          getClaimWorkflow(claim, policyMap),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
  }, [dateFrom, dateTo, policyFilter, policyMap, searchTerm, statusFilter, userClaims]);

  const selectedClaim = useMemo(
    () => userClaims.find((claim) => claim.id === selectedClaimId) || null,
    [selectedClaimId, userClaims]
  );

  const selectedPolicy = selectedClaim ? policyMap.get(selectedClaim.policyId) || null : null;
  const selectedTimeline = useMemo(
    () => (selectedClaim ? buildTimeline(selectedClaim) : []),
    [selectedClaim]
  );
  const selectedEvidence = selectedClaim ? getClaimEvidence(selectedClaim) : [];

  const handleExportCsv = () => {
    if (!filteredClaims.length) return;
    const header = [
      'Claim ID',
      'Workflow',
      'Status',
      'Amount Requested',
      'Expected Reimbursement',
      'Last Updated',
    ];
    const rows = filteredClaims.map((claim) => [
      claim.claimNumber || claim.id,
      getClaimWorkflow(claim, policyMap),
      claim.status || 'Unknown',
      Number(claim.damageEstimate || 0),
      Number(claim.estimatedPayout || 0),
      claim.updatedAt || claim.createdAt,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'claims-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="claims-shell">
      <header className="dashboard-header">
        <div>
          <h1 className="header-title">Claims</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            to="/dashboard/claims/chat"
            className="btn-secondary"
            style={{ padding: '0.7rem 1.1rem', fontSize: '0.88rem' }}
          >
            Chat with Sarah
          </Link>
          <Link
            to="/dashboard/claims/new"
            className="btn-primary"
            style={{ padding: '0.7rem 1.1rem', fontSize: '0.88rem' }}
          >
            + File New Claim
          </Link>
        </div>
      </header>

      {createdMessage ? <div className="success-banner">{createdMessage}</div> : null}

      <section className="card claims-history-card">
        <div className="claims-history-head">
          <div>
            <p className="claims-history-kicker">Claims history</p>
            <h2>Incident ledger</h2>
          </div>
          <button
            type="button"
            className="btn-secondary claims-export-btn"
            onClick={handleExportCsv}
            disabled={controlsDisabled}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        <div className="claims-filters-row">
          <label className="claims-filter-field claims-filter-search">
            <Search size={15} />
            <input
              type="text"
              className="flow-input"
              placeholder="Search by claim ID, workflow, incident type"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              disabled={controlsDisabled}
            />
          </label>

          <label className="claims-filter-field">
            <span>Status</span>
            <select
              className="flow-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              disabled={controlsDisabled}
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="claims-filter-field">
            <span>Policy</span>
            <select
              className="flow-input"
              value={policyFilter}
              onChange={(event) => setPolicyFilter(event.target.value)}
              disabled={controlsDisabled}
            >
              <option value="all">All policies</option>
              {userPolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.policyNumber}
                </option>
              ))}
            </select>
          </label>

          <label className="claims-filter-field">
            <span>Date from</span>
            <input
              type="date"
              className="flow-input"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              disabled={controlsDisabled}
            />
          </label>

          <label className="claims-filter-field">
            <span>Date to</span>
            <input
              type="date"
              className="flow-input"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              disabled={controlsDisabled}
            />
          </label>
        </div>

        {filteredClaims.length === 0 ? (
          <div className="claims-empty-state">
            <div className="claims-empty-icon">
              {controlsDisabled ? <FileSearch size={28} /> : <CalendarRange size={28} />}
            </div>
            <h3>{controlsDisabled ? 'No claims yet' : 'No claims match these filters'}</h3>
            <p>
              {controlsDisabled
                ? 'File a claim when an AI workflow incident causes a loss or compliance issue.'
                : 'Try broadening the date window or removing a filter.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <Link to="/dashboard/claims/chat" className="btn-secondary">
                Chat with Sarah
              </Link>
              <Link to="/dashboard/claims/new" className="btn-primary">
                File New Claim
              </Link>
            </div>
          </div>
        ) : (
          <div className="claims-table-wrap">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Workflow / Use Case</th>
                  <th>Status</th>
                  <th>Amount Requested</th>
                  <th>Est. Reimbursement</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} onClick={() => setSelectedClaimId(claim.id)}>
                    <td>
                      <strong>{claim.claimNumber || claim.id}</strong>
                    </td>
                    <td>{getClaimWorkflow(claim, policyMap)}</td>
                    <td>
                      <span className={`claim-pill ${getStatusClass(claim.status)}`}>{claim.status}</span>
                    </td>
                    <td>{formatCurrency(claim.damageEstimate || 0)}</td>
                    <td>{formatCurrency(claim.estimatedPayout || 0)}</td>
                    <td>{formatDate(claim.updatedAt || claim.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="claims-row-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedClaimId(claim.id);
                        }}
                      >
                        View
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedClaim ? (
        <>
          <button type="button" className="claims-drawer-backdrop" onClick={() => setSelectedClaimId(null)} />
          <aside className="claims-drawer">
            <div className="claims-drawer-head">
              <div>
                <p>Claim detail</p>
                <h3>{selectedClaim.claimNumber || selectedClaim.id}</h3>
              </div>
              <button type="button" className="claims-drawer-close" onClick={() => setSelectedClaimId(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="claims-drawer-section">
              <span className={`claim-pill ${getStatusClass(selectedClaim.status)}`}>
                {selectedClaim.status}
              </span>
              <p>{selectedClaim.summary || selectedClaim.answers?.incidentSummary || 'No summary provided.'}</p>
            </div>

            <div className="claims-drawer-grid">
              <div>
                <span>Workflow</span>
                <strong>{getClaimWorkflow(selectedClaim, policyMap)}</strong>
              </div>
              <div>
                <span>Policy</span>
                <strong>{selectedPolicy?.policyNumber || 'Not linked'}</strong>
              </div>
              <div>
                <span>Incident type</span>
                <strong>{selectedClaim.incidentType || 'General incident'}</strong>
              </div>
              <div>
                <span>Severity</span>
                <strong>{selectedClaim.severity || selectedClaim.answers?.severity || 'Not specified'}</strong>
              </div>
              <div>
                <span>Requested</span>
                <strong>{formatCurrency(selectedClaim.damageEstimate || 0)}</strong>
              </div>
              <div>
                <span>Expected reimbursement</span>
                <strong>{formatCurrency(selectedClaim.estimatedPayout || 0)}</strong>
              </div>
            </div>

            <div className="claims-drawer-section">
              <h4>Timeline</h4>
              <div className="claims-timeline">
                {selectedTimeline.map((item) => (
                  <div key={item.id} className="claims-timeline-item">
                    <div className="claims-timeline-dot" />
                    <div>
                      <p>{item.title}</p>
                      <small>{item.detail}</small>
                      <span>{formatDate(item.at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="claims-drawer-section">
              <h4>Evidence</h4>
              {selectedEvidence.length ? (
                <ul className="claims-evidence-list">
                  {selectedEvidence.map((file) => (
                    <li key={file}>
                      <ShieldAlert size={14} />
                      {file}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="policy-meta">No files uploaded yet.</p>
              )}
            </div>

            <div className="claims-drawer-actions">
              <Link to={`/dashboard/copilot?claim=${selectedClaim.id}`} className="btn-primary">
                Ask Rexy about this claim
              </Link>
              <Link to="/dashboard/claims/new" className="btn-secondary">
                File another claim
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
};

export default Claims;
