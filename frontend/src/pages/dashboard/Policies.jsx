import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Download, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { formatCurrency, formatDate } from '../../lib/formatters';

const STATUS_FILTERS = ['All', 'Active', 'Pending review', 'Quoted', 'Expired'];
const SOURCE_FILTERS = ['All', 'Live', 'Mock'];

const MOCK_RECENT_POLICIES = [
  {
    id: 'MOCK-4401',
    policyNumber: 'REX-44019',
    workflow: 'AI SaaS Infrastructure',
    status: 'Quoted',
    monthlyPremium: 5800,
    coverageLimit: 12000000,
    effectiveDate: '2026-02-01',
    source: 'Mock',
  },
  {
    id: 'MOCK-4402',
    policyNumber: 'REX-44022',
    workflow: 'Automated Claims Triage',
    status: 'Pending review',
    monthlyPremium: 3450,
    coverageLimit: 7000000,
    effectiveDate: '2026-01-18',
    source: 'Mock',
  },
  {
    id: 'MOCK-4403',
    policyNumber: 'REX-44037',
    workflow: 'Fraud Decisioning API',
    status: 'Active',
    monthlyPremium: 4200,
    coverageLimit: 9000000,
    effectiveDate: '2026-01-04',
    source: 'Mock',
  },
];

function getStatusClass(status) {
  return String(status || 'Unknown')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

const Policies = () => {
  const { userPolicies, userClaims } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');

  const claimsByPolicy = useMemo(() => {
    const grouped = new Map();
    userClaims.forEach((claim) => {
      const next = grouped.get(claim.policyId) || 0;
      grouped.set(claim.policyId, next + 1);
    });
    return grouped;
  }, [userClaims]);

  const livePolicies = useMemo(
    () =>
      userPolicies.map((policy) => ({
        id: policy.id,
        policyNumber: policy.policyNumber || policy.id,
        workflow: policy.useCase || 'General AI workflow coverage',
        status: policy.status || 'Active',
        monthlyPremium: Number(policy.monthlyPremium || 0),
        coverageLimit: Number(policy.coverageLimit || 0),
        effectiveDate: policy.effectiveDate || policy.createdAt || new Date().toISOString(),
        source: 'Live',
      })),
    [userPolicies]
  );

  const allPolicies = useMemo(
    () =>
      [...livePolicies, ...MOCK_RECENT_POLICIES].sort(
        (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
      ),
    [livePolicies]
  );

  const filteredPolicies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allPolicies.filter((policy) => {
      if (statusFilter !== 'All' && policy.status !== statusFilter) return false;
      if (sourceFilter !== 'All' && policy.source !== sourceFilter) return false;

      if (!query) return true;
      const haystack = [policy.policyNumber, policy.workflow, policy.status, policy.source]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [allPolicies, searchTerm, sourceFilter, statusFilter]);

  const handleExportCsv = () => {
    if (!filteredPolicies.length) return;

    const header = [
      'Policy Number',
      'Workflow',
      'Status',
      'Monthly Premium',
      'Coverage Limit',
      'Effective Date',
      'Source',
    ];
    const rows = filteredPolicies.map((policy) => [
      policy.policyNumber,
      policy.workflow,
      policy.status,
      Number(policy.monthlyPremium || 0),
      Number(policy.coverageLimit || 0),
      policy.effectiveDate,
      policy.source,
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
    link.download = 'recent-policies.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="policies-shell">
      <header className="dashboard-header">
        <div>
          <h1 className="header-title">Policies</h1>
        </div>
        <Link to="/dashboard/policies/new" className="btn-primary">
          + New Policy
        </Link>
      </header>

      <section className="card claims-history-card">
        <div className="claims-history-head">
          <div>
            <p className="claims-history-kicker">Recent policies</p>
            <h2>Coverage ledger</h2>
          </div>
          <button type="button" className="btn-secondary claims-export-btn" onClick={handleExportCsv}>
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
              placeholder="Search by policy number, workflow, status"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="claims-filter-field">
            <span>Status</span>
            <select
              className="flow-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="claims-filter-field">
            <span>Source</span>
            <select
              className="flow-input"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
            >
              {SOURCE_FILTERS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredPolicies.length === 0 ? (
          <div className="claims-empty-state">
            <div className="claims-empty-icon">
              <ShieldCheck size={28} />
            </div>
            <h3>No policies match these filters</h3>
            <p>Try removing a filter or searching with broader keywords.</p>
            <Link to="/dashboard/policies/new" className="btn-primary">
              Create Policy
            </Link>
          </div>
        ) : (
          <div className="claims-table-wrap">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Workflow / Use Case</th>
                  <th>Status</th>
                  <th>Monthly Premium</th>
                  <th>Coverage Limit</th>
                  <th>Effective Date</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((policy) => {
                  const linkedClaims = claimsByPolicy.get(policy.id) || 0;
                  return (
                    <tr key={policy.id}>
                      <td>
                        <strong>{policy.policyNumber}</strong>
                        <small>{linkedClaims} linked claim{linkedClaims === 1 ? '' : 's'}</small>
                      </td>
                      <td>{policy.workflow}</td>
                      <td>
                        <span className={`policy-ledger-status ${getStatusClass(policy.status)}`}>{policy.status}</span>
                      </td>
                      <td>{formatCurrency(policy.monthlyPremium)}</td>
                      <td>{formatCurrency(policy.coverageLimit)}</td>
                      <td>{formatDate(policy.effectiveDate)}</td>
                      <td>
                        <span className={`policy-ledger-source ${policy.source.toLowerCase()}`}>{policy.source}</span>
                      </td>
                      <td>
                        <div className="policy-ledger-actions">
                          <Link to="/dashboard/copilot" className="claims-row-action">
                            Ask Rexy
                          </Link>
                          <Link to="/dashboard/claims/new" className="claims-row-action">
                            File Claim <ArrowUpRight size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card policy-mock-card">
        <div className="card-title">
          <span>Mock policy preview</span>
          <Sparkles size={15} color="var(--color-primary)" />
        </div>
        <p className="policy-meta">Draft example for an AI claims-routing workflow with liability and response coverage.</p>
        <div className="policy-mock-grid">
          <div>
            <span>Workflow</span>
            <strong>Autonomous Claims Routing</strong>
          </div>
          <div>
            <span>Coverage limit</span>
            <strong>{formatCurrency(8000000)}</strong>
          </div>
          <div>
            <span>Deductible</span>
            <strong>{formatCurrency(50000)}</strong>
          </div>
          <div>
            <span>Monthly premium</span>
            <strong>{formatCurrency(3900)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Policies;
