import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Copy,
  Download,
  FileCheck,
  FileText,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { MetricCards } from '../../components/metric-cards';
import { ClaimsChart } from '../../components/claims-chart';
import { ClaimsTable } from '../../components/claims-table';

const FALLBACK_METRICS = {
  evaluator: 99.0,
  openClaimsCount: 525,
  openClaimsRequested: 27167740,
  openClaimsPotential: 26578740,
  closedClaimsCount: 475,
  closedClaimsRequested: 25594200,
  closedClaimsPaidBack: 25049100,
  inReviewCount: 182,
  approvedPaidCount: 475,
  avgCloseDays: 4.2,
  resolutionRate: 97.8,
  workflowAccuracy: 99.4,
  riskScore: 'Low',
  coverageUtilization: 12.3,
  totalProtectedValue: 48500000,
  claimsThisMonth: 47,
  avgClaimValue: 54200,
};

function getClaimsSummary(claims) {
  if (!claims.length) {
    return FALLBACK_METRICS;
  }

  const openStatuses = new Set(['Open', 'In review', 'In Review', 'Needs info', 'Approved']);
  const closedStatuses = new Set(['Closed', 'Paid']);
  const inReviewStatuses = new Set(['In review', 'In Review', 'Needs info']);
  const approvedStatuses = new Set(['Approved', 'Paid', 'Closed']);

  const openClaims = claims.filter((claim) => openStatuses.has(claim.status));
  const closedClaims = claims.filter((claim) => closedStatuses.has(claim.status));
  const inReviewCount = claims.filter((claim) => inReviewStatuses.has(claim.status)).length;
  const approvedPaidCount = claims.filter((claim) => approvedStatuses.has(claim.status)).length;

  const avgCloseDays = closedClaims.length
    ? closedClaims.reduce((total, claim) => {
        const created = new Date(claim.createdAt).getTime();
        const closed = new Date(claim.closedAt || claim.createdAt).getTime();
        const days = Math.max(0, (closed - created) / (1000 * 60 * 60 * 24));
        return total + days;
      }, 0) / closedClaims.length
    : FALLBACK_METRICS.avgCloseDays;

  const totalClaims = openClaims.length + closedClaims.length;
  const resolutionRate = totalClaims > 0 ? (approvedPaidCount / totalClaims) * 100 : 97.8;

  return {
    evaluator: 99.0,
    openClaimsCount: openClaims.length || FALLBACK_METRICS.openClaimsCount,
    openClaimsRequested: openClaims.reduce(
      (total, claim) => total + Number(claim.damageEstimate || 0),
      0
    ) || FALLBACK_METRICS.openClaimsRequested,
    openClaimsPotential: openClaims.reduce(
      (total, claim) => total + Number(claim.estimatedPayout || 0),
      0
    ) || FALLBACK_METRICS.openClaimsPotential,
    closedClaimsCount: closedClaims.length || FALLBACK_METRICS.closedClaimsCount,
    closedClaimsRequested: closedClaims.reduce(
      (total, claim) => total + Number(claim.damageEstimate || 0),
      0
    ) || FALLBACK_METRICS.closedClaimsRequested,
    closedClaimsPaidBack: closedClaims.reduce(
      (total, claim) => total + Number(claim.approvedPayout || claim.estimatedPayout || 0),
      0
    ) || FALLBACK_METRICS.closedClaimsPaidBack,
    inReviewCount: inReviewCount || FALLBACK_METRICS.inReviewCount,
    approvedPaidCount: approvedPaidCount || FALLBACK_METRICS.approvedPaidCount,
    avgCloseDays,
    resolutionRate: resolutionRate || FALLBACK_METRICS.resolutionRate,
    workflowAccuracy: FALLBACK_METRICS.workflowAccuracy,
    riskScore: FALLBACK_METRICS.riskScore,
    coverageUtilization: FALLBACK_METRICS.coverageUtilization,
    totalProtectedValue: FALLBACK_METRICS.totalProtectedValue,
    claimsThisMonth: FALLBACK_METRICS.claimsThisMonth,
    avgClaimValue: FALLBACK_METRICS.avgClaimValue,
  };
}

const Overview = () => {
  const { currentUser, userPolicies, userClaims } = useAppData();
  const latestPolicy = userPolicies[0] || null;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const summary = useMemo(() => getClaimsSummary(userClaims), [userClaims]);

  const coveredWorkflows = useMemo(() => {
    const fromPolicies = userPolicies
      .map((policy) => policy.useCase)
      .filter(Boolean)
      .slice(0, 4);
    if (fromPolicies.length > 0) return fromPolicies;
    return ['AI SaaS Infrastructure', 'AI Agents'];
  }, [userPolicies]);

  const handleDownloadProof = () => {
    if (!latestPolicy) return;

    const content = [
      'Proof of Insurance',
      `Policyholder: ${currentUser?.fullName || 'Policyholder'}`,
      `Policy Number: ${latestPolicy.policyNumber}`,
      `Coverage Limit: ${formatCurrency(latestPolicy.coverageLimit)}`,
      `Deductible: ${formatCurrency(latestPolicy.deductible)}`,
      `Effective Date: ${formatDate(latestPolicy.effectiveDate)}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `proof-${latestPolicy.policyNumber}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyProofLink = async () => {
    if (!latestPolicy) return;
    const link = `${window.location.origin}/dashboard/policies?policy=${latestPolicy.id}`;
    await navigator.clipboard.writeText(link);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="header-title">
            Good afternoon, {currentUser?.fullName?.split(' ')[0] || 'Member'}
          </h1>
        </div>
      </header>

      {/* Metric Cards Row */}
      <MetricCards metrics={summary} />

      {/* Main Grid - Hero Card + Claims Snapshot */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Evaluator Hero Card */}
        <section className="card eval-hero-card-v3 xl:col-span-3">
          <div className="eval-hero-header">
            <div className="eval-hero-badges">
              <span className="eval-date-badge">
                <CalendarDays size={14} />
                {today}
              </span>
              <span className="eval-status-badge-v3">
                <span className="status-dot-v3" />
                System Healthy
              </span>
            </div>
          </div>

          <div className="eval-hero-body">
            <div className="eval-score-section">
              <p className="eval-label-v3">Evaluator Score</p>
              <h2 className="eval-number-v3">{summary.evaluator.toFixed(1)}%</h2>
              <p className="eval-sublabel">Correct workflows (last 30 days)</p>
              <div className="eval-trend-v3">
                <TrendingUp size={14} />
                <span>+0.3% from last period</span>
              </div>
            </div>

            <div className="eval-metrics-section">
              <div className="eval-metric-row">
                <div className="eval-metric-item">
                  <span className="eval-metric-label">Protected Value</span>
                  <span className="eval-metric-value">{formatCurrency(summary.totalProtectedValue)}</span>
                </div>
                <div className="eval-metric-item">
                  <span className="eval-metric-label">Open Claims</span>
                  <span className="eval-metric-value">{formatCurrency(summary.openClaimsRequested)}</span>
                </div>
              </div>
              <div className="eval-metric-row">
                <div className="eval-metric-item">
                  <span className="eval-metric-label">Total Reimbursed</span>
                  <span className="eval-metric-value">{formatCurrency(summary.closedClaimsPaidBack)}</span>
                </div>
                <div className="eval-metric-item">
                  <span className="eval-metric-label">Avg Claim Value</span>
                  <span className="eval-metric-value">{formatCurrency(summary.avgClaimValue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="eval-hero-footer">
            <Link to="/dashboard/claims" className="eval-btn-primary">
              View All Claims
            </Link>
            <Link to="/dashboard/claims/new" className="eval-btn-secondary">
              File New Claim
            </Link>
          </div>
        </section>

        {/* Claims Snapshot */}
        <section className="card claims-snapshot-v2 xl:col-span-2">
          <div className="snapshot-header">
            <h3>Claims Snapshot</h3>
            <Link to="/dashboard/claims" className="snapshot-link">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="snapshot-stats">
            <div className="snapshot-stat primary">
              <div className="stat-value">{summary.openClaimsCount}</div>
              <div className="stat-label">Open Claims</div>
              <div className="stat-bar">
                <div className="stat-bar-fill-green" style={{ width: '65%' }} />
              </div>
            </div>

            <div className="snapshot-stat">
              <div className="stat-value">{summary.inReviewCount}</div>
              <div className="stat-label">In Review</div>
              <div className="stat-bar">
                <div className="stat-bar-fill-green" style={{ width: '35%', opacity: 0.7 }} />
              </div>
            </div>

            <div className="snapshot-stat">
              <div className="stat-value">{summary.approvedPaidCount}</div>
              <div className="stat-label">Approved</div>
              <div className="stat-bar">
                <div className="stat-bar-fill-green" style={{ width: '90%' }} />
              </div>
            </div>
          </div>

          <div className="snapshot-metrics">
            <div className="snapshot-metric">
              <Clock size={16} />
              <div>
                <span>Avg. Resolution</span>
                <strong>{summary.avgCloseDays.toFixed(1)} days</strong>
              </div>
            </div>
            <div className="snapshot-metric">
              <Zap size={16} />
              <div>
                <span>This Month</span>
                <strong>{summary.claimsThisMonth} claims</strong>
              </div>
            </div>
            <div className="snapshot-metric">
              <FileCheck size={16} />
              <div>
                <span>Avg. Claim Value</span>
                <strong>{formatCurrency(summary.avgClaimValue)}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Claims Activity Chart */}
      <ClaimsChart />

      {/* Claims Table */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <ClaimsTable />
      </div>

      {/* Bottom Section - Proof and Coverage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card proof-card-v2">
          <div className="card-title">
            Proof of Insurance
            <ShieldCheck size={18} color="var(--color-primary)" />
          </div>

          {latestPolicy ? (
            <>
              <div className="proof-details-v2">
                <div className="proof-detail">
                  <span>Policyholder</span>
                  <strong>{currentUser?.fullName || 'Policyholder'}</strong>
                </div>
                <div className="proof-detail">
                  <span>Effective date</span>
                  <strong>{formatDate(latestPolicy.effectiveDate)}</strong>
                </div>
                <div className="proof-detail">
                  <span>Coverage limit</span>
                  <strong>{formatCurrency(latestPolicy.coverageLimit)}</strong>
                </div>
              </div>
              <div className="proof-actions-v2">
                <button type="button" className="btn-primary" onClick={handleDownloadProof}>
                  <Download size={15} />
                  Download PDF
                </button>
                <button type="button" className="btn-secondary" onClick={handleCopyProofLink}>
                  <Copy size={14} />
                  Copy Link
                </button>
              </div>
            </>
          ) : (
            <div className="empty-inline">
              <p>No active policy yet. Complete the policy flow to generate proof of insurance.</p>
              <Link to="/dashboard/policies/new" className="btn-primary">
                Begin Policy Flow
              </Link>
            </div>
          )}
        </section>

        <section className="card coverage-card-v2">
          <div className="card-title">
            Coverage Overview
            <FileText size={18} color="var(--color-primary)" />
          </div>

          <div className="coverage-details-v2">
            <div className="coverage-row">
              <span>Covered workflows</span>
              <div className="chip-list">
                {coveredWorkflows.map((workflowItem) => (
                  <span key={workflowItem} className="coverage-chip">
                    {workflowItem}
                  </span>
                ))}
              </div>
            </div>
            <div className="coverage-row">
              <span>Coverage Limit</span>
              <strong>{latestPolicy ? formatCurrency(latestPolicy.coverageLimit) : '$10,000,000'}</strong>
            </div>
            <div className="coverage-row">
              <span>Deductible</span>
              <strong>{latestPolicy ? formatCurrency(latestPolicy.deductible) : '$50,000'}</strong>
            </div>
            <div className="coverage-row">
              <span>Incident types</span>
              <div className="chip-list">
                <span className="coverage-chip">Downtime</span>
                <span className="coverage-chip">Automation regression</span>
                <span className="coverage-chip">Decisioning error</span>
              </div>
            </div>
          </div>

          <div className="coverage-actions-v2">
            <Link to="/dashboard/policies" className="btn-primary">
              View Policy
            </Link>
            <Link to="/dashboard/copilot" className="btn-secondary">
              Ask Rexy
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Overview;
