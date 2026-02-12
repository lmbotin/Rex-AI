import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, ChevronLeft, ChevronRight, CloudUpload, Sparkles } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { formatCurrency } from '../../lib/formatters';

const CLAIM_STEPS = [
  { id: 'workflow', label: 'Workflow + policy', helper: 'Map incident to the covered use case.' },
  { id: 'incident', label: 'Incident details', helper: 'Describe what failed and when.' },
  { id: 'impact', label: 'Impact + amount', helper: 'Capture business impact and requested reimbursement.' },
  { id: 'evidence', label: 'Upload evidence', helper: 'Attach screenshots, logs, and supporting docs.' },
  { id: 'review', label: 'Review + submit', helper: 'Confirm and submit for Rexy + underwriting review.' },
];

const INCIDENT_TYPES = [
  'Service outage',
  'Automation regression',
  'Decisioning error',
  'Compliance incident',
  'Prompt injection exploit',
  'Other',
];

const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

function getClaimErrors(stepId, form) {
  const errors = {};

  if (stepId === 'workflow') {
    if (!form.policyId) errors.policyId = 'Select the policy tied to this incident.';
    if (!form.workflowName.trim()) errors.workflowName = 'Choose or enter the affected workflow.';
  }

  if (stepId === 'incident') {
    if (!form.incidentType) errors.incidentType = 'Select an incident type.';
    if (!form.severity) errors.severity = 'Set a severity level.';
    if (!form.incidentDate) errors.incidentDate = 'Provide incident date.';
    if (!form.incidentSummary.trim()) errors.incidentSummary = 'Describe what happened.';
  }

  if (stepId === 'impact') {
    if (!form.damageEstimate || Number(form.damageEstimate) <= 0) {
      errors.damageEstimate = 'Enter a valid requested amount.';
    }
    if (!form.impactDetails.trim()) errors.impactDetails = 'Summarize user or revenue impact.';
  }

  if (stepId === 'review' && !form.confirmed) {
    errors.confirmed = 'Confirm the statement before submitting.';
  }

  return errors;
}

const NewClaim = () => {
  const navigate = useNavigate();
  const { userPolicies, createClaim } = useAppData();

  const workflowOptions = useMemo(
    () =>
      Array.from(new Set(userPolicies.map((policy) => policy.useCase).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [userPolicies]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    policyId: userPolicies[0]?.id || '',
    workflowName: workflowOptions[0] || '',
    incidentType: '',
    severity: '',
    incidentDate: '',
    incidentTime: '',
    incidentLocation: '',
    incidentSummary: '',
    damageEstimate: '',
    impactDetails: '',
    evidenceFiles: [],
    contactPhone: '',
    preferredContact: 'Rexy chat',
    confirmed: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rexyHint, setRexyHint] = useState('Rexy can prefill each stage based on your selected policy.');

  const currentStep = CLAIM_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / CLAIM_STEPS.length) * 100;
  const selectedPolicy = userPolicies.find((policy) => policy.id === form.policyId) || null;

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleApplyRexy = () => {
    if (currentStep.id === 'workflow') {
      const fallbackWorkflow = selectedPolicy?.useCase || workflowOptions[0] || 'AI Workflow Incident';
      setForm((previous) => ({
        ...previous,
        workflowName: previous.workflowName || fallbackWorkflow,
      }));
      setRexyHint('Rexy mapped this claim to your active workflow coverage.');
      return;
    }

    if (currentStep.id === 'incident') {
      setForm((previous) => ({
        ...previous,
        incidentType: previous.incidentType || 'Service outage',
        severity: previous.severity || 'High',
        incidentSummary:
          previous.incidentSummary ||
          'Third-party AI infrastructure outage degraded workflow decisions for customer-facing automation.',
      }));
      setRexyHint('Rexy drafted an incident narrative based on common outage patterns.');
      return;
    }

    if (currentStep.id === 'impact') {
      const fallbackAmount = selectedPolicy
        ? Math.max(5000, Math.round(Number(selectedPolicy.coverageLimit || 0) * 0.02))
        : 25000;
      setForm((previous) => ({
        ...previous,
        damageEstimate: previous.damageEstimate || String(fallbackAmount),
        impactDetails:
          previous.impactDetails ||
          'Automation failures delayed customer operations and triggered manual remediation costs.',
      }));
      setRexyHint('Rexy estimated impact using your policy profile and workflow type.');
      return;
    }

    if (currentStep.id === 'evidence') {
      setRexyHint('Rexy recommends uploading logs, screenshots, and postmortem PDFs for faster review.');
      return;
    }

    if (currentStep.id === 'review') {
      setForm((previous) => ({ ...previous, confirmed: true }));
      setRexyHint('Rexy marked your submission as complete for underwriting review.');
    }
  };

  const handleNext = () => {
    const nextErrors = getClaimErrors(currentStep.id, form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStepIndex((previous) => Math.min(previous + 1, CLAIM_STEPS.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStepIndex((previous) => Math.max(previous - 1, 0));
  };

  const handleEvidenceUpload = (event) => {
    const files = Array.from(event.target.files || []).map((file) => file.name);
    if (!files.length) return;
    setForm((previous) => ({
      ...previous,
      evidenceFiles: Array.from(new Set([...previous.evidenceFiles, ...files])),
    }));
    setRexyHint(`${files.length} evidence file(s) attached.`);
  };

  const handleSubmit = async () => {
    const allErrors = CLAIM_STEPS.reduce((accumulator, step) => {
      const stepErrors = getClaimErrors(step.id, form);
      return { ...accumulator, ...stepErrors };
    }, {});

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstErrorStep = CLAIM_STEPS.findIndex(
        (step) => Object.keys(getClaimErrors(step.id, form)).length > 0
      );
      if (firstErrorStep >= 0) setStepIndex(firstErrorStep);
      return;
    }

    setIsSubmitting(true);
    try {
      const claim = createClaim({
        policyId: form.policyId,
        workflowName: form.workflowName,
        incidentType: form.incidentType,
        severity: form.severity,
        incidentDate: form.incidentDate,
        incidentTime: form.incidentTime,
        incidentLocation: form.incidentLocation,
        description: form.incidentSummary,
        damageEstimate: form.damageEstimate,
        impactDetails: form.impactDetails,
        evidenceFiles: form.evidenceFiles,
        contactPhone: form.contactPhone,
        preferredContact: form.preferredContact,
      });
      navigate(`/dashboard/claims?created=${claim.id}`);
    } catch (error) {
      setErrors({ submit: error.message || 'Unable to submit this claim.' });
      setIsSubmitting(false);
    }
  };

  if (userPolicies.length === 0) {
    return (
      <div>
        <header className="dashboard-header">
          <div>
            <h1 className="header-title">File New Claim</h1>
          </div>
        </header>

        <div className="card empty-state">
          <h3>Create a policy first</h3>
          <p>Start the policy flow, activate coverage, then return here to file an incident.</p>
          <Link to="/dashboard/policies/new" className="btn-primary">
            Start Policy Flow
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="claim-flow-shell">
      <header className="dashboard-header">
        <div>
          <h1 className="header-title">File New Claim</h1>
        </div>
        <span className="flow-badge">
          <Sparkles size={14} />
          {Math.round(progress)}% complete
        </span>
      </header>

      <div className="claim-flow-layout">
        <aside className="card claim-stepper">
          <div className="claim-stepper-head">
            <span>Step {stepIndex + 1} of {CLAIM_STEPS.length}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="flow-progress-track">
            <div className="flow-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="claim-step-list">
            {CLAIM_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`claim-step-item ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
                onClick={() => setStepIndex(index)}
              >
                <span className="claim-step-index">
                  {index < stepIndex ? <CheckCircle2 size={14} /> : index + 1}
                </span>
                <div>
                  <p>{step.label}</p>
                  <small>{step.helper}</small>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="card claim-flow-card">
          {currentStep.id === 'workflow' ? (
            <div className="claim-form-grid">
              <label>
                Policy
                <select
                  className="flow-input"
                  value={form.policyId}
                  onChange={(event) => updateField('policyId', event.target.value)}
                >
                  <option value="">Select policy</option>
                  {userPolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.policyNumber} · {policy.useCase}
                    </option>
                  ))}
                </select>
                {errors.policyId ? <small className="flow-error">{errors.policyId}</small> : null}
              </label>

              <label>
                Workflow / use case
                <input
                  type="text"
                  className="flow-input"
                  list="claim-workflows"
                  value={form.workflowName}
                  onChange={(event) => updateField('workflowName', event.target.value)}
                  placeholder="e.g. Prior Auth Agent"
                />
                <datalist id="claim-workflows">
                  {workflowOptions.map((workflow) => (
                    <option key={workflow} value={workflow} />
                  ))}
                </datalist>
                {errors.workflowName ? <small className="flow-error">{errors.workflowName}</small> : null}
              </label>
            </div>
          ) : null}

          {currentStep.id === 'incident' ? (
            <div className="claim-form-grid">
              <label>
                Incident type
                <select
                  className="flow-input"
                  value={form.incidentType}
                  onChange={(event) => updateField('incidentType', event.target.value)}
                >
                  <option value="">Select incident type</option>
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.incidentType ? <small className="flow-error">{errors.incidentType}</small> : null}
              </label>

              <label>
                Severity
                <select
                  className="flow-input"
                  value={form.severity}
                  onChange={(event) => updateField('severity', event.target.value)}
                >
                  <option value="">Select severity</option>
                  {SEVERITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                {errors.severity ? <small className="flow-error">{errors.severity}</small> : null}
              </label>

              <label>
                Incident date
                <input
                  type="date"
                  className="flow-input"
                  value={form.incidentDate}
                  onChange={(event) => updateField('incidentDate', event.target.value)}
                />
                {errors.incidentDate ? <small className="flow-error">{errors.incidentDate}</small> : null}
              </label>

              <label>
                Incident time
                <input
                  type="time"
                  className="flow-input"
                  value={form.incidentTime}
                  onChange={(event) => updateField('incidentTime', event.target.value)}
                />
              </label>

              <label className="claim-form-full">
                Region / environment
                <input
                  type="text"
                  className="flow-input"
                  value={form.incidentLocation}
                  onChange={(event) => updateField('incidentLocation', event.target.value)}
                  placeholder="US-East · Production cluster"
                />
              </label>

              <label className="claim-form-full">
                Incident summary
                <textarea
                  className="flow-input flow-textarea"
                  value={form.incidentSummary}
                  onChange={(event) => updateField('incidentSummary', event.target.value)}
                  placeholder="What happened, where the workflow failed, and who was affected."
                />
                {errors.incidentSummary ? <small className="flow-error">{errors.incidentSummary}</small> : null}
              </label>
            </div>
          ) : null}

          {currentStep.id === 'impact' ? (
            <div className="claim-form-grid">
              <label>
                Amount requested (USD)
                <input
                  type="number"
                  min="0"
                  className="flow-input"
                  value={form.damageEstimate}
                  onChange={(event) => updateField('damageEstimate', event.target.value)}
                  placeholder="250000"
                />
                {errors.damageEstimate ? <small className="flow-error">{errors.damageEstimate}</small> : null}
              </label>

              <label>
                Preferred contact
                <select
                  className="flow-input"
                  value={form.preferredContact}
                  onChange={(event) => updateField('preferredContact', event.target.value)}
                >
                  <option value="Rexy chat">Rexy chat</option>
                  <option value="Email">Email</option>
                  <option value="Phone">Phone</option>
                </select>
              </label>

              <label>
                Contact phone
                <input
                  type="tel"
                  className="flow-input"
                  value={form.contactPhone}
                  onChange={(event) => updateField('contactPhone', event.target.value)}
                  placeholder="+1 (555) 100-2000"
                />
              </label>

              <label className="claim-form-full">
                Impact details
                <textarea
                  className="flow-input flow-textarea"
                  value={form.impactDetails}
                  onChange={(event) => updateField('impactDetails', event.target.value)}
                  placeholder="Explain customer, regulatory, and operational impact."
                />
                {errors.impactDetails ? <small className="flow-error">{errors.impactDetails}</small> : null}
              </label>
            </div>
          ) : null}

          {currentStep.id === 'evidence' ? (
            <div className="claim-evidence-stage">
              <label className="claim-upload-zone">
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleEvidenceUpload}
                  hidden
                />
                <div>
                  <h3>Upload evidence files</h3>
                  <p>Accepted formats: PDF, PNG, JPG, and incident screenshots.</p>
                </div>
                <span className="btn-secondary">
                  <CloudUpload size={15} />
                  Select files
                </span>
              </label>

              {form.evidenceFiles.length > 0 ? (
                <ul className="claim-evidence-list">
                  {form.evidenceFiles.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              ) : (
                <p className="policy-meta">No files uploaded yet. You can still submit and add evidence later in Rexy.</p>
              )}
            </div>
          ) : null}

          {currentStep.id === 'review' ? (
            <div className="claim-review-stage">
              <div className="claim-review-grid">
                <div>
                  <span>Policy</span>
                  <strong>{selectedPolicy?.policyNumber || 'Not selected'}</strong>
                </div>
                <div>
                  <span>Workflow</span>
                  <strong>{form.workflowName || 'Not provided'}</strong>
                </div>
                <div>
                  <span>Incident</span>
                  <strong>{form.incidentType || 'Not provided'}</strong>
                </div>
                <div>
                  <span>Severity</span>
                  <strong>{form.severity || 'Not provided'}</strong>
                </div>
                <div>
                  <span>Requested amount</span>
                  <strong>{formatCurrency(form.damageEstimate || 0)}</strong>
                </div>
                <div>
                  <span>Evidence files</span>
                  <strong>{form.evidenceFiles.length}</strong>
                </div>
              </div>

              <label className="flow-checkbox">
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={(event) => updateField('confirmed', event.target.checked)}
                />
                <span>I confirm this claim report is accurate and complete.</span>
              </label>
              {errors.confirmed ? <small className="flow-error">{errors.confirmed}</small> : null}
              {errors.submit ? <small className="flow-error">{errors.submit}</small> : null}
            </div>
          ) : null}

          <div className="claim-flow-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/claims')}>
              Cancel
            </button>
            <div>
              <button type="button" className="btn-secondary" onClick={handleBack} disabled={stepIndex === 0}>
                <ChevronLeft size={15} />
                Back
              </button>
              {stepIndex === CLAIM_STEPS.length - 1 ? (
                <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Next
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="card claim-rexy-panel">
          <div className="claim-rexy-head">
            <Bot size={16} />
            Rexy Assistant
          </div>
          <p>{currentStep.helper}</p>
          <button type="button" className="btn-secondary" onClick={handleApplyRexy}>
            Apply Rexy Suggestion
          </button>
          <small>{rexyHint}</small>
        </aside>
      </div>
    </div>
  );
};

export default NewClaim;
