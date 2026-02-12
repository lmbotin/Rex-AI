import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  CircleCheckBig,
  CloudUpload,
  FileStack,
  FileText,
  Radar,
  ShieldCheck,
  Siren,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  getWorkflowStorageKey,
  loadFromStorage,
  REXY_ASSIST_STORAGE_KEY,
  saveToStorage,
} from '../../lib/workflow';

const INDUSTRIES = [
  'Financial Services',
  'Healthcare',
  'E-commerce',
  'Enterprise SaaS',
  'Logistics',
  'Developer Tools',
];

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-1000',
  '1000+',
];

const USE_CASES = ['Generative AI', 'AI Agents', 'Automated Decisioning'];
const DEPLOYMENT_STAGES = ['Pilot', 'Production'];

const COVERAGE_GAPS = [
  'Traditional cyber policy excludes AI incidents',
  'E&O policy lacks model-performance language',
  'No dedicated AI liability coverage',
  'Unclear response path for AI workflow failures',
];

const EXCLUSION_OPTIONS = [
  'Unapproved model deployments',
  'Intentional policy bypass',
  'Non-production experiments',
];

const defaultFlowState = {
  intake: {
    companyName: '',
    contactEmail: '',
    companySize: '',
    industryVertical: '',
    useCaseType: '',
    deploymentStage: 'Pilot',
    coverageGap: '',
    aiRevenueExposure: '',
    platformName: '',
    primaryRegion: '',
    agentAutonomy: '',
    agentDecisionScope: '',
    submittedAt: null,
  },
  technical: {
    skipCall: false,
    scheduleDate: '',
    scheduleTime: '',
    docs: [],
    scheduledAt: null,
  },
  analytics: null,
  underwriting: {
    interviewer: '',
    interviewSummary: '',
    redTeamFindings: '',
    completedAt: null,
  },
  quote: {
    coverageLimit: 5000000,
    deductible: 25000,
    exclusions: [],
    addOns: {
      regulatoryDefense: true,
      ipInfringement: false,
      performanceWarranty: false,
    },
    generatedAt: null,
  },
  binding: {
    signerName: '',
    billingEmail: '',
    accepted: false,
    boundAt: null,
    badgeId: '',
    certificateId: '',
    apiKey: '',
    policyId: '',
  },
  monitoring: {
    webhookUrl: '',
    regulatoryAlerts: true,
    incidentPortal: true,
    configuredAt: null,
    incidentTriggeredAt: null,
  },
};

function calculateRiskAnalytics(flow) {
  const stage = flow.intake.deploymentStage;
  const useCase = flow.intake.useCaseType;
  const docsCount = flow.technical.docs.length;

  let baseScore = stage === 'Production' ? 62 : 72;
  if (useCase === 'AI Agents') baseScore -= 8;
  if (useCase === 'Automated Decisioning') baseScore -= 5;
  baseScore += Math.min(8, docsCount * 2);

  const resilienceScore = Math.max(35, Math.min(92, baseScore));

  return {
    processedAt: new Date().toISOString(),
    resilienceScore,
    benchmarks: [
      { label: 'Model performance', value: Math.max(42, resilienceScore - 6) },
      { label: 'Fairness controls', value: Math.max(35, resilienceScore - 9) },
      { label: 'Robustness testing', value: Math.max(40, resilienceScore - 4) },
      { label: 'Privacy controls', value: Math.max(38, resilienceScore - 7) },
      { label: 'Regulatory readiness', value: Math.max(34, resilienceScore - 10) },
    ],
    coverageGaps: [
      'Traditional cyber/E&O does not address hallucination-driven losses.',
      'No explicit workflow interruption language for AI dependency failures.',
      'Limited protection for prompt-injection related operational incidents.',
    ],
  };
}

function calculatePremium(flow, resilienceScore) {
  const limitInMillions = Number(flow.quote.coverageLimit || 0) / 1000000;
  const deductible = Number(flow.quote.deductible || 0);
  const riskMultiplier = 1 + (Math.max(0, 80 - resilienceScore) / 100);
  const deductibleRelief = Math.max(0.68, 1 - deductible / 350000);
  const addOnCost =
    (flow.quote.addOns.regulatoryDefense ? 620 : 0) +
    (flow.quote.addOns.ipInfringement ? 740 : 0) +
    (flow.quote.addOns.performanceWarranty ? 980 : 0);

  return Math.round(limitInMillions * 820 * riskMultiplier * deductibleRelief + addOnCost);
}

function deriveStatus(flow) {
  return {
    intakeReady: Boolean(flow.intake.submittedAt),
    technicalReady: Boolean(flow.technical.scheduledAt) || flow.technical.docs.length > 0,
    analyticsReady: Boolean(flow.analytics?.processedAt),
    underwritingReady: Boolean(flow.underwriting.completedAt),
    quoteReady: Boolean(flow.quote.generatedAt),
    bindingReady: Boolean(flow.binding.boundAt),
    monitoringReady: Boolean(flow.monitoring.configuredAt),
  };
}

function mergeAssistDraft(baseState, assistDraft, currentUser) {
  if (!assistDraft || typeof assistDraft !== 'object') return baseState;

  const nextState = JSON.parse(JSON.stringify(baseState));
  nextState.intake.companyName = assistDraft.companyName || assistDraft.platformName || nextState.intake.companyName;
  nextState.intake.contactEmail = assistDraft.contactEmail || currentUser?.email || nextState.intake.contactEmail;
  nextState.intake.companySize = assistDraft.companySize || nextState.intake.companySize;
  nextState.intake.industryVertical = assistDraft.industryVertical || nextState.intake.industryVertical;
  nextState.intake.useCaseType = assistDraft.useCaseType || nextState.intake.useCaseType;
  nextState.intake.deploymentStage = assistDraft.deploymentStage || nextState.intake.deploymentStage;
  nextState.intake.coverageGap = assistDraft.coverageGap || nextState.intake.coverageGap;
  nextState.intake.aiRevenueExposure = assistDraft.aiRevenueExposure || nextState.intake.aiRevenueExposure;
  nextState.intake.platformName = assistDraft.platformName || nextState.intake.platformName;
  nextState.intake.primaryRegion = assistDraft.primaryRegion || nextState.intake.primaryRegion;
  nextState.intake.agentAutonomy = assistDraft.agentAutonomy || nextState.intake.agentAutonomy;
  nextState.intake.agentDecisionScope =
    assistDraft.agentDecisionScope || nextState.intake.agentDecisionScope;

  if (assistDraft.coverageLimit) nextState.quote.coverageLimit = Number(assistDraft.coverageLimit);
  if (assistDraft.deductible) nextState.quote.deductible = Number(assistDraft.deductible);
  if (assistDraft.addOns) nextState.quote.addOns = { ...nextState.quote.addOns, ...assistDraft.addOns };

  return nextState;
}

const NewPolicy = () => {
  const { currentUser, createPolicy } = useAppData();

  const storageKey = useMemo(
    () => getWorkflowStorageKey(currentUser?.id),
    [currentUser?.id]
  );

  const [flow, setFlow] = useState(() => {
    const stored = loadFromStorage(storageKey, null);
    if (stored) return stored;

    const assistDraft = loadFromStorage(REXY_ASSIST_STORAGE_KEY, null);
    const hydrated = mergeAssistDraft(defaultFlowState, assistDraft, currentUser);
    hydrated.intake.contactEmail = hydrated.intake.contactEmail || currentUser?.email || '';
    return hydrated;
  });

  const [notice, setNotice] = useState('');

  useEffect(() => {
    saveToStorage(storageKey, flow);
  }, [storageKey, flow]);

  const analytics = flow.analytics || calculateRiskAnalytics(flow);
  const livePremium = useMemo(
    () => calculatePremium(flow, analytics.resilienceScore),
    [flow, analytics.resilienceScore]
  );
  const status = deriveStatus(flow);

  const updateIntake = (field, value) => {
    setFlow((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        [field]: value,
      },
    }));
  };

  const updateTechnical = (field, value) => {
    setFlow((prev) => ({
      ...prev,
      technical: {
        ...prev.technical,
        [field]: value,
      },
    }));
  };

  const updateQuote = (field, value) => {
    setFlow((prev) => ({
      ...prev,
      quote: {
        ...prev.quote,
        [field]: value,
      },
    }));
  };

  const updateAddOn = (field, value) => {
    setFlow((prev) => ({
      ...prev,
      quote: {
        ...prev.quote,
        addOns: {
          ...prev.quote.addOns,
          [field]: value,
        },
      },
    }));
  };

  const handleSaveIntake = () => {
    if (
      !flow.intake.companyName ||
      !flow.intake.contactEmail ||
      !flow.intake.companySize ||
      !flow.intake.industryVertical ||
      !flow.intake.useCaseType
    ) {
      setNotice('Complete company profile, use-case, and contact fields before continuing.');
      return;
    }

    setFlow((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        submittedAt: new Date().toISOString(),
      },
    }));
    setNotice('Risk intake captured. You can now schedule technical evaluation or upload docs.');
  };

  const handleTechnicalFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    const names = files.map((file) => file.name);
    updateTechnical('docs', names);
    setNotice(`Uploaded ${names.length} technical document(s).`);
  };

  const handleSaveTechnical = () => {
    if (!flow.technical.skipCall && (!flow.technical.scheduleDate || !flow.technical.scheduleTime)) {
      setNotice('Select a schedule date/time or enable direct technical assessment.');
      return;
    }
    setFlow((prev) => ({
      ...prev,
      technical: {
        ...prev.technical,
        scheduledAt: new Date().toISOString(),
      },
    }));
    setNotice('Technical review pathway is active.');
  };

  const handleRunAnalytics = () => {
    const results = calculateRiskAnalytics(flow);
    setFlow((prev) => ({
      ...prev,
      analytics: results,
    }));
    setNotice('Risk analytics completed. Coverage gaps are now available.');
  };

  const handleCompleteUnderwriting = () => {
    if (!flow.underwriting.interviewer || !flow.underwriting.interviewSummary) {
      setNotice('Add interviewer and assessment summary before finalizing underwriting.');
      return;
    }
    setFlow((prev) => ({
      ...prev,
      underwriting: {
        ...prev.underwriting,
        completedAt: new Date().toISOString(),
      },
    }));
    setNotice('Human-in-the-loop underwriting is complete.');
  };

  const handleGenerateQuote = () => {
    if (!status.analyticsReady || !status.underwritingReady) {
      setNotice('Run analytics and finalize underwriting before generating a bindable quote.');
      return;
    }
    setFlow((prev) => ({
      ...prev,
      quote: {
        ...prev.quote,
        generatedAt: new Date().toISOString(),
      },
    }));
    setNotice('Bindable quote generated with real-time premium.');
  };

  const handleBindCoverage = () => {
    if (!flow.quote.generatedAt) {
      setNotice('Generate a quote before binding coverage.');
      return;
    }
    if (!flow.binding.signerName || !flow.binding.billingEmail || !flow.binding.accepted) {
      setNotice('Provide signer, billing email, and e-sign confirmation to bind.');
      return;
    }
    if (flow.binding.boundAt) {
      setNotice('Coverage already bound. Configure monitoring below.');
      return;
    }

    const policy = createPolicy({
      fullName: flow.intake.companyName || currentUser?.fullName || 'AI Company',
      email: flow.intake.contactEmail || currentUser?.email || '',
      coverageType: flow.intake.useCaseType || 'Professional Liability',
      useCase: flow.intake.useCaseType || 'Small Business',
      protectedAsset: flow.intake.platformName || 'AI workflow system',
      operationState: flow.intake.primaryRegion || 'N/A',
      startDate: new Date().toISOString().slice(0, 10),
      teamSize: flow.intake.companySize || '1',
      annualVolume: flow.intake.aiRevenueExposure || '0',
      coverageLimit: String(flow.quote.coverageLimit),
      deductible: String(flow.quote.deductible),
      priorClaims: '0',
      monthlyBudget: String(livePremium),
      additionalNotes: flow.underwriting.interviewSummary,
    });

    setFlow((prev) => ({
      ...prev,
      binding: {
        ...prev.binding,
        boundAt: new Date().toISOString(),
        badgeId: `ARMILLA-VERIFIED-${Math.floor(100000 + Math.random() * 900000)}`,
        certificateId: `CERT-${Math.floor(100000 + Math.random() * 900000)}`,
        apiKey: `arm_live_${Math.random().toString(36).slice(2, 14)}`,
        policyId: policy.id,
      },
    }));
    window.localStorage.removeItem(REXY_ASSIST_STORAGE_KEY);
    setNotice('Coverage bound successfully. Badge and API credentials are now active.');
  };

  const handleConfigureMonitoring = () => {
    if (!flow.binding.boundAt) {
      setNotice('Bind policy first to activate continuous monitoring.');
      return;
    }
    setFlow((prev) => ({
      ...prev,
      monitoring: {
        ...prev.monitoring,
        configuredAt: new Date().toISOString(),
      },
    }));
    setNotice('Continuous monitoring has been configured.');
  };

  const triggerIncidentResponse = () => {
    setFlow((prev) => ({
      ...prev,
      monitoring: {
        ...prev.monitoring,
        incidentTriggeredAt: new Date().toISOString(),
      },
    }));
    setNotice('Incident response portal activated. Armilla crisis workflow engaged.');
  };

  return (
    <div className="coverage-system-shell">
      <header className="dashboard-header">
        <div>
          <h1 className="header-title">AI Coverage System</h1>
        </div>
        <Link to="/dashboard/copilot" className="btn-primary">
          <Bot size={16} />
          Open Rexy Guidance
        </Link>
      </header>

      <div className="coverage-ribbon">
        <div className={`coverage-ribbon-item ${status.intakeReady ? 'done' : ''}`}>
          <FileText size={15} />
          Intake
        </div>
        <div className={`coverage-ribbon-item ${status.technicalReady ? 'done' : ''}`}>
          <CalendarDays size={15} />
          Technical Review
        </div>
        <div className={`coverage-ribbon-item ${status.analyticsReady ? 'done' : ''}`}>
          <ChartNoAxesCombined size={15} />
          Analytics
        </div>
        <div className={`coverage-ribbon-item ${status.underwritingReady ? 'done' : ''}`}>
          <Radar size={15} />
          Underwriting
        </div>
        <div className={`coverage-ribbon-item ${status.quoteReady ? 'done' : ''}`}>
          <WalletCards size={15} />
          Quote
        </div>
        <div className={`coverage-ribbon-item ${status.bindingReady ? 'done' : ''}`}>
          <BadgeCheck size={15} />
          Verified
        </div>
        <div className={`coverage-ribbon-item ${status.monitoringReady ? 'done' : ''}`}>
          <ShieldCheck size={15} />
          Monitoring
        </div>
      </div>

      {notice ? <div className="success-banner">{notice}</div> : null}

      <section className="card system-panel">
        <div className="system-panel-head">
          <div>
            <h3>Risk Assessment Intake</h3>
            <p>
              Capture business context, AI deployment profile, and coverage exposure signals.
            </p>
          </div>
          {status.intakeReady ? (
            <span className="panel-state done">
              <CircleCheckBig size={14} /> Saved
            </span>
          ) : (
            <span className="panel-state">In progress</span>
          )}
        </div>

        <div className="system-grid three">
          <label>
            Company name
            <input
              className="flow-input"
              value={flow.intake.companyName}
              onChange={(event) => updateIntake('companyName', event.target.value)}
              placeholder="Acme AI Labs"
            />
          </label>
          <label>
            Contact email
            <input
              className="flow-input"
              type="email"
              value={flow.intake.contactEmail}
              onChange={(event) => updateIntake('contactEmail', event.target.value)}
              placeholder="risk@company.com"
            />
          </label>
          <label>
            Company size
            <select
              className="flow-input"
              value={flow.intake.companySize}
              onChange={(event) => updateIntake('companySize', event.target.value)}
            >
              <option value="">Select</option>
              {COMPANY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label>
            Industry vertical
            <select
              className="flow-input"
              value={flow.intake.industryVertical}
              onChange={(event) => updateIntake('industryVertical', event.target.value)}
            >
              <option value="">Select</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </label>
          <label>
            AI use case
            <select
              className="flow-input"
              value={flow.intake.useCaseType}
              onChange={(event) => updateIntake('useCaseType', event.target.value)}
            >
              <option value="">Select</option>
              {USE_CASES.map((useCase) => (
                <option key={useCase} value={useCase}>
                  {useCase}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deployment stage
            <select
              className="flow-input"
              value={flow.intake.deploymentStage}
              onChange={(event) => updateIntake('deploymentStage', event.target.value)}
            >
              {DEPLOYMENT_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>
          <label>
            Current coverage gap
            <select
              className="flow-input"
              value={flow.intake.coverageGap}
              onChange={(event) => updateIntake('coverageGap', event.target.value)}
            >
              <option value="">Select</option>
              {COVERAGE_GAPS.map((gap) => (
                <option key={gap} value={gap}>
                  {gap}
                </option>
              ))}
            </select>
          </label>
          <label>
            AI revenue exposure (USD)
            <input
              className="flow-input"
              type="number"
              value={flow.intake.aiRevenueExposure}
              onChange={(event) => updateIntake('aiRevenueExposure', event.target.value)}
              placeholder="2500000"
            />
          </label>
          <label>
            Primary region
            <input
              className="flow-input"
              value={flow.intake.primaryRegion}
              onChange={(event) => updateIntake('primaryRegion', event.target.value)}
              placeholder="United States"
            />
          </label>
        </div>

        <div className="system-grid two">
          <label>
            Insured AI platform / workflow
            <input
              className="flow-input"
              value={flow.intake.platformName}
              onChange={(event) => updateIntake('platformName', event.target.value)}
              placeholder="Autonomous underwriting agent"
            />
          </label>
          {flow.intake.useCaseType === 'AI Agents' ? (
            <>
              <label>
                Agent autonomy level
                <input
                  className="flow-input"
                  value={flow.intake.agentAutonomy}
                  onChange={(event) => updateIntake('agentAutonomy', event.target.value)}
                  placeholder="High / Medium / Low"
                />
              </label>
              <label>
                Decision-making scope
                <input
                  className="flow-input"
                  value={flow.intake.agentDecisionScope}
                  onChange={(event) => updateIntake('agentDecisionScope', event.target.value)}
                  placeholder="Customer-facing pricing and approvals"
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="system-panel-actions">
          <button type="button" className="btn-primary" onClick={handleSaveIntake}>
            Save Intake Profile
          </button>
        </div>
      </section>

      <section className="card system-panel">
        <div className="system-panel-head">
          <div>
            <h3>Technical Evaluation</h3>
            <p>
              Schedule the AI risk engineer review or move straight to technical assessment.
            </p>
          </div>
          {status.technicalReady ? (
            <span className="panel-state done">
              <CircleCheckBig size={14} /> Ready
            </span>
          ) : (
            <span className="panel-state">Pending</span>
          )}
        </div>

        <div className="system-grid two">
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={flow.technical.skipCall}
              onChange={(event) => updateTechnical('skipCall', event.target.checked)}
            />
            <span>High intent path: skip intro call and upload technical docs now</span>
          </label>

          {!flow.technical.skipCall ? (
            <div className="system-grid two">
              <label>
                Schedule date
                <input
                  className="flow-input"
                  type="date"
                  value={flow.technical.scheduleDate}
                  onChange={(event) => updateTechnical('scheduleDate', event.target.value)}
                />
              </label>
              <label>
                Schedule time
                <input
                  className="flow-input"
                  type="time"
                  value={flow.technical.scheduleTime}
                  onChange={(event) => updateTechnical('scheduleTime', event.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="doc-upload-zone">
          <div>
            <h4>Technical Documentation Upload</h4>
            <p>Model cards, bias audits, safety evaluations, and security assessments.</p>
          </div>
          <label className="btn-secondary upload-btn">
            <CloudUpload size={15} />
            Upload files
            <input type="file" multiple onChange={handleTechnicalFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {flow.technical.docs.length > 0 ? (
          <div className="doc-list">
            {flow.technical.docs.map((doc) => (
              <div key={doc} className="doc-item">
                <FileStack size={14} />
                {doc}
              </div>
            ))}
          </div>
        ) : null}

        <div className="system-panel-actions">
          <button type="button" className="btn-primary" onClick={handleSaveTechnical}>
            Confirm Technical Path
          </button>
        </div>
      </section>

      <section className="system-grid two">
        <article className="card system-panel compact">
          <div className="system-panel-head">
            <div>
              <h3>AI Risk Analytics Engine</h3>
              <p>Automated scoring across fairness, robustness, privacy, and compliance.</p>
            </div>
          </div>

          <div className="risk-score-card">
            <span>Preliminary resilience score</span>
            <strong>{analytics.resilienceScore}</strong>
          </div>

          <div className="benchmark-list">
            {analytics.benchmarks.map((item) => (
              <div key={item.label} className="benchmark-item">
                <div className="benchmark-head">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="benchmark-track">
                  <div style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="gap-list">
            {analytics.coverageGaps.map((gap) => (
              <div key={gap} className="gap-item">
                <Siren size={14} />
                {gap}
              </div>
            ))}
          </div>

          <div className="system-panel-actions">
            <button type="button" className="btn-secondary" onClick={handleRunAnalytics}>
              Process Risk Engine
            </button>
          </div>
        </article>

        <article className="card system-panel compact">
          <div className="system-panel-head">
            <div>
              <h3>Human Underwriting Review</h3>
              <p>
                Technical interview and red-team findings documented with your ML engineering team.
              </p>
            </div>
          </div>

          <div className="system-grid one">
            <label>
              AI risk engineer
              <input
                className="flow-input"
                value={flow.underwriting.interviewer}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    underwriting: {
                      ...prev.underwriting,
                      interviewer: event.target.value,
                    },
                  }))
                }
                placeholder="Name of reviewer"
              />
            </label>
            <label>
              Technical interview summary
              <textarea
                className="flow-input flow-textarea"
                value={flow.underwriting.interviewSummary}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    underwriting: {
                      ...prev.underwriting,
                      interviewSummary: event.target.value,
                    },
                  }))
                }
                placeholder="Summarize architecture, controls, and risk posture."
              />
            </label>
            <label>
              Red-team findings
              <textarea
                className="flow-input flow-textarea"
                value={flow.underwriting.redTeamFindings}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    underwriting: {
                      ...prev.underwriting,
                      redTeamFindings: event.target.value,
                    },
                  }))
                }
                placeholder="Prompt injection, hallucination, edge-case failures."
              />
            </label>
          </div>

          <div className="system-panel-actions">
            <button type="button" className="btn-secondary" onClick={handleCompleteUnderwriting}>
              Finalize Underwriting
            </button>
          </div>
        </article>
      </section>

      <section className="card system-panel">
        <div className="system-panel-head">
          <div>
            <h3>Quote Studio</h3>
            <p>Configure limits, deductibles, exclusions, and add-ons with live premium updates.</p>
          </div>
          {status.quoteReady ? (
            <span className="panel-state done">
              <CircleCheckBig size={14} /> Bindable quote
            </span>
          ) : (
            <span className="panel-state">Draft quote</span>
          )}
        </div>

        <div className="quote-live-card">
          <span>Estimated monthly premium</span>
          <strong>{formatCurrency(livePremium)}</strong>
        </div>

        <div className="system-grid two">
          <label>
            Coverage limit: {formatCurrency(flow.quote.coverageLimit)}
            <input
              type="range"
              min={1000000}
              max={25000000}
              step={500000}
              value={flow.quote.coverageLimit}
              onChange={(event) => updateQuote('coverageLimit', Number(event.target.value))}
            />
          </label>
          <label>
            Deductible (USD)
            <input
              className="flow-input"
              type="number"
              value={flow.quote.deductible}
              onChange={(event) => updateQuote('deductible', Number(event.target.value))}
            />
          </label>
        </div>

        <div className="system-grid two">
          <div>
            <p className="policy-meta">Add-on coverages</p>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={flow.quote.addOns.regulatoryDefense}
                onChange={(event) => updateAddOn('regulatoryDefense', event.target.checked)}
              />
              <span>Regulatory defense</span>
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={flow.quote.addOns.ipInfringement}
                onChange={(event) => updateAddOn('ipInfringement', event.target.checked)}
              />
              <span>IP infringement</span>
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={flow.quote.addOns.performanceWarranty}
                onChange={(event) => updateAddOn('performanceWarranty', event.target.checked)}
              />
              <span>Performance warranty</span>
            </label>
          </div>

          <div>
            <p className="policy-meta">Exclusions</p>
            <div className="chip-grid">
              {EXCLUSION_OPTIONS.map((exclusion) => {
                const active = flow.quote.exclusions.includes(exclusion);
                return (
                  <button
                    type="button"
                    key={exclusion}
                    className={`flow-choice ${active ? 'active' : ''}`}
                    onClick={() =>
                      updateQuote(
                        'exclusions',
                        active
                          ? flow.quote.exclusions.filter((item) => item !== exclusion)
                          : [...flow.quote.exclusions, exclusion]
                      )
                    }
                  >
                    <span>{exclusion}</span>
                    {active ? <CircleCheckBig size={14} /> : <Sparkles size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="system-panel-actions">
          <button type="button" className="btn-primary" onClick={handleGenerateQuote}>
            Generate Bindable Quote
          </button>
        </div>
      </section>

      <section className="system-grid two">
        <article className="card system-panel compact">
          <div className="system-panel-head">
            <div>
              <h3>Binding + Verified Badge</h3>
              <p>Complete payment and e-signature to issue policy assets and API credentials.</p>
            </div>
          </div>

          <div className="system-grid one">
            <label>
              Signer name
              <input
                className="flow-input"
                value={flow.binding.signerName}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    binding: { ...prev.binding, signerName: event.target.value },
                  }))
                }
                placeholder="Authorized signer"
              />
            </label>
            <label>
              Billing email
              <input
                className="flow-input"
                type="email"
                value={flow.binding.billingEmail}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    binding: { ...prev.binding, billingEmail: event.target.value },
                  }))
                }
                placeholder="billing@company.com"
              />
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={flow.binding.accepted}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    binding: { ...prev.binding, accepted: event.target.checked },
                  }))
                }
              />
              <span>I confirm payment and e-signature readiness</span>
            </label>
          </div>

          <div className="system-panel-actions">
            <button type="button" className="btn-primary" onClick={handleBindCoverage}>
              Bind Coverage
            </button>
          </div>

          {flow.binding.boundAt ? (
            <div className="verified-box">
              <div className="verified-head">
                <BadgeCheck size={18} />
                Armilla Verified Active
              </div>
              <p>Badge ID: {flow.binding.badgeId}</p>
              <p>Certificate: {flow.binding.certificateId}</p>
              <p>API key: {flow.binding.apiKey}</p>
              <p>Bound: {formatDate(flow.binding.boundAt)}</p>
            </div>
          ) : null}
        </article>

        <article className="card system-panel compact">
          <div className="system-panel-head">
            <div>
              <h3>Continuous Monitoring</h3>
              <p>Configure policy telemetry, alerts, and incident response workflows.</p>
            </div>
          </div>

          <div className="system-grid one">
            <label>
              Incident webhook URL
              <input
                className="flow-input"
                value={flow.monitoring.webhookUrl}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    monitoring: { ...prev.monitoring, webhookUrl: event.target.value },
                  }))
                }
                placeholder="https://your-domain.com/webhooks/ai-incident"
              />
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={flow.monitoring.regulatoryAlerts}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    monitoring: { ...prev.monitoring, regulatoryAlerts: event.target.checked },
                  }))
                }
              />
              <span>Regulatory update alerts</span>
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={flow.monitoring.incidentPortal}
                onChange={(event) =>
                  setFlow((prev) => ({
                    ...prev,
                    monitoring: { ...prev.monitoring, incidentPortal: event.target.checked },
                  }))
                }
              />
              <span>Enable crisis coordination portal</span>
            </label>
          </div>

          <div className="system-panel-actions">
            <button type="button" className="btn-secondary" onClick={handleConfigureMonitoring}>
              Save Monitoring Setup
            </button>
            <button type="button" className="btn-primary" onClick={triggerIncidentResponse}>
              Trigger Incident Response
            </button>
          </div>

          <div className="monitoring-state">
            <div>
              <span>Policy status</span>
              <strong>{flow.binding.boundAt ? 'Active' : 'Pending Binding'}</strong>
            </div>
            <div>
              <span>Monitoring configured</span>
              <strong>{flow.monitoring.configuredAt ? formatDate(flow.monitoring.configuredAt) : 'Not configured'}</strong>
            </div>
            <div>
              <span>Latest incident trigger</span>
              <strong>
                {flow.monitoring.incidentTriggeredAt
                  ? formatDate(flow.monitoring.incidentTriggeredAt)
                  : 'No active incident'}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default NewPolicy;
