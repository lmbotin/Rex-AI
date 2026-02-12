import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, Circle, Clock3, Lightbulb, Sparkles, WandSparkles } from 'lucide-react';

function getInitialAnswers(questions) {
  return questions.reduce((accumulator, question) => {
    const defaultValue = question.defaultValue ?? '';
    return {
      ...accumulator,
      [question.id]: defaultValue,
    };
  }, {});
}

function isAnswerValid(question, answer) {
  if (!question.required) return true;

  if (question.type === 'checkbox') {
    return Boolean(answer);
  }

  return String(answer ?? '').trim().length > 0;
}

function hasAnswer(question, answer) {
  if (question.type === 'checkbox') return Boolean(answer);
  return String(answer ?? '').trim().length > 0;
}

function buildSections(questions, answers, step) {
  const sectionsMap = new Map();

  questions.forEach((question, index) => {
    const sectionKey = question.section || 'Details';
    const existing = sectionsMap.get(sectionKey);
    if (!existing) {
      sectionsMap.set(sectionKey, {
        name: sectionKey,
        start: index,
        end: index,
        total: 1,
        completed: hasAnswer(question, answers[question.id]) ? 1 : 0,
      });
      return;
    }

    existing.end = index;
    existing.total += 1;
    if (hasAnswer(question, answers[question.id])) {
      existing.completed += 1;
    }
  });

  return Array.from(sectionsMap.values()).map((section) => ({
    ...section,
    isCurrent: step >= section.start && step <= section.end,
    isDone: section.completed === section.total,
  }));
}

function ChoiceGroup({ question, value, onChange }) {
  return (
    <div className="flow-choice-grid">
      {question.options?.map((option) => {
        const active = value === option.value;
        return (
          <button
            type="button"
            key={option.value}
            className={`flow-choice ${active ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            {active ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </button>
        );
      })}
    </div>
  );
}

function QuestionInput({ question, value, onChange, onSubmitShortcut }) {
  if (question.type === 'select' && (question.options?.length || 0) <= 6) {
    return <ChoiceGroup question={question} value={value} onChange={onChange} />;
  }

  if (question.type === 'select') {
    return (
      <select className="flow-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select an option</option>
        {question.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (question.type === 'textarea') {
    return (
      <textarea
        className="flow-input flow-textarea"
        value={value}
        placeholder={question.placeholder || ''}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            onSubmitShortcut();
          }
        }}
      />
    );
  }

  if (question.type === 'checkbox') {
    return (
      <label className="flow-checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{question.checkboxLabel || 'Yes, I confirm this information is correct.'}</span>
      </label>
    );
  }

  return (
    <input
      className="flow-input"
      type={question.type || 'text'}
      value={value}
      placeholder={question.placeholder || ''}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onSubmitShortcut();
        }
      }}
    />
  );
}

const MultiStepFlow = ({
  title,
  description,
  questions,
  submitLabel,
  submittingLabel,
  initialAnswers,
  copilot,
  onSubmit,
  onCancel,
}) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => ({
    ...getInitialAnswers(questions),
    ...(initialAnswers || {}),
  }));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copilotNotice, setCopilotNotice] = useState('');

  const currentQuestion = questions[step];
  const progress = useMemo(() => ((step + 1) / questions.length) * 100, [step, questions.length]);
  const progressLabel = `${Math.round(progress)}% complete`;
  const answer = answers[currentQuestion.id];
  const canContinue = isAnswerValid(currentQuestion, answer);
  const sections = useMemo(() => buildSections(questions, answers, step), [questions, answers, step]);
  const answeredCount = useMemo(
    () => questions.filter((question) => hasAnswer(question, answers[question.id])).length,
    [questions, answers]
  );
  const minutesRemaining = Math.max(1, Math.ceil((questions.length - step - 1) / 2.2));
  const copilotSuggestion = useMemo(
    () => copilot?.getSuggestion?.({ question: currentQuestion, answers, step, questions }) || null,
    [copilot, currentQuestion, answers, step, questions]
  );

  const handleChange = (value) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));
    setError('');
    setCopilotNotice('');
  };

  const handleNext = () => {
    if (!canContinue) {
      setError('Please complete this step before continuing.');
      return;
    }
    setStep((previous) => Math.min(previous + 1, questions.length - 1));
  };

  const handleBack = () => {
    setError('');
    setStep((previous) => Math.max(previous - 1, 0));
  };

  const handleSubmit = async () => {
    if (!canContinue) {
      setError('Please complete this step before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(answers);
    } catch (submitError) {
      setError(submitError.message || 'We could not submit this flow.');
      setIsSubmitting(false);
    }
  };

  const handleShortcutSubmit = () => {
    if (step === questions.length - 1) {
      handleSubmit();
      return;
    }
    handleNext();
  };

  const handleApplySuggestion = () => {
    if (!copilotSuggestion || copilotSuggestion.value === undefined) return;
    handleChange(copilotSuggestion.value);
    setCopilotNotice(copilotSuggestion.notice || 'Rexy filled this answer for you.');
  };

  const handleApplyDraft = () => {
    const draft = copilot?.getDraft?.(answers);
    if (!draft || typeof draft !== 'object') {
      setCopilotNotice('Rexy could not build a draft from the current data.');
      return;
    }

    setAnswers((previous) => {
      const next = { ...previous };
      Object.entries(draft).forEach(([field, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          next[field] = value;
        }
      });
      return next;
    });
    setCopilotNotice(copilot?.draftNotice || 'Rexy prefilled a policy draft.');
  };

  const previewItems = Object.entries(answers)
    .map(([questionId, value]) => {
      const question = questions.find((item) => item.id === questionId);
      if (!question || !hasAnswer(question, value)) return null;
      if (question.type === 'checkbox') return null;
      if (question.type === 'select') {
        const selectedOption = question.options?.find((option) => option.value === value);
        return { id: questionId, label: question.shortLabel || question.label, value: selectedOption?.label || value };
      }
      return { id: questionId, label: question.shortLabel || question.label, value };
    })
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="flow-wrapper flow-experience">
      <header className="dashboard-header">
        <div>
          <h1 className="header-title">{title}</h1>
          <p className="header-subtitle">{description}</p>
        </div>
        <div className="flow-header-meta">
          <span className="flow-badge">
            <Sparkles size={14} />
            Guided Workflow
          </span>
          {copilot ? (
            <span className="flow-badge muted">
              <Bot size={14} />
              {copilot.name || 'Rexy Active'}
            </span>
          ) : null}
          <span className="flow-badge muted">
            <Clock3 size={14} />
            {minutesRemaining} min remaining
          </span>
        </div>
      </header>

      <div className="flow-grid">
        <aside className="card flow-sidebar">
          <div className="flow-sidebar-head">
            <p className="flow-step-label">
              Step {step + 1} of {questions.length}
            </p>
            <p className="flow-sidebar-progress">{progressLabel}</p>
          </div>
          <div className="flow-progress-track">
            <div className="flow-progress-bar" style={{ width: `${progress}%` }} />
          </div>

          <div className="flow-stats-row">
            <div>
              <span>Answered</span>
              <strong>{answeredCount}</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{questions.length - answeredCount}</strong>
            </div>
          </div>

          <div className="flow-section-list">
            {sections.map((section) => (
              <div
                key={section.name}
                className={`flow-section-item ${section.isCurrent ? 'current' : ''} ${section.isDone ? 'done' : ''}`}
              >
                <div>
                  <p className="flow-section-name">{section.name}</p>
                  <p className="flow-section-count">
                    {section.completed}/{section.total} completed
                  </p>
                </div>
                <div className="flow-section-icon">
                  {section.isDone ? <CheckCircle2 size={16} /> : section.isCurrent ? <Sparkles size={16} /> : <Circle size={16} />}
                </div>
              </div>
            ))}
          </div>

          {previewItems.length > 0 ? (
            <div className="flow-preview">
              <p className="flow-preview-title">Current answers</p>
              <div className="flow-preview-list">
                {previewItems.map((item) => (
                  <div key={item.id} className="flow-preview-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {copilot?.getDraft ? (
            <button type="button" className="btn-secondary flow-draft-btn" onClick={handleApplyDraft}>
              <WandSparkles size={14} />
              {copilot.draftLabel || 'Autofill Draft'}
            </button>
          ) : null}
        </aside>

        <section className="card flow-card">
          <div className="flow-top">
            <div className="flow-step-label">Question {step + 1}</div>
            <div className="flow-step-required">{currentQuestion.required ? 'Required' : 'Optional'}</div>
          </div>

          <div className="flow-question">
            <label className="flow-question-label">{currentQuestion.label}</label>
            {currentQuestion.hint ? <p className="flow-question-hint">{currentQuestion.hint}</p> : null}

            {copilot ? (
              <div className="flow-copilot-card">
                <div className="flow-copilot-head">
                  <div>
                    <p className="flow-copilot-title">{copilot.name || 'Rexy Co-pilot'}</p>
                    <p className="flow-copilot-subtitle">
                      {copilot.subtitle || 'Guidance for AI workflow insurance questions.'}
                    </p>
                  </div>
                  <Lightbulb size={16} />
                </div>
                {copilotSuggestion?.tip ? <p className="flow-copilot-tip">{copilotSuggestion.tip}</p> : null}
                <div className="flow-copilot-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleApplySuggestion}
                    disabled={!copilotSuggestion || copilotSuggestion.value === undefined}
                  >
                    Apply Rexy Suggestion
                  </button>
                </div>
                {copilotNotice ? <p className="flow-copilot-notice">{copilotNotice}</p> : null}
              </div>
            ) : null}

            <QuestionInput
              question={currentQuestion}
              value={answer}
              onChange={handleChange}
              onSubmitShortcut={handleShortcutSubmit}
            />
            {error ? <p className="flow-error">{error}</p> : null}
          </div>

          <div className="flow-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={handleBack} disabled={step === 0}>
                Back
              </button>
              {step === questions.length - 1 ? (
                <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? submittingLabel : submitLabel}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Save & Next
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MultiStepFlow;
