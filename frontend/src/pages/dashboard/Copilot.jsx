import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Paperclip, PhoneCall, Send, Upload } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

const REXY_PHONE = '+1 (555) 901-2468';

const QUICK_PROMPTS = [
  'Check if this incident is covered',
  'Help me file a claim',
  'What evidence do you need?',
  'Summarize policy exclusions',
];

function createRexyReply(input, contextLabel) {
  const prompt = input.toLowerCase();
  if (prompt.includes('covered') || prompt.includes('coverage')) {
    return `I checked ${contextLabel}. Coverage likely applies if you include timeline evidence and evaluator logs.`;
  }
  if (prompt.includes('evidence') || prompt.includes('upload')) {
    return 'For fastest review, upload model logs, incident screenshots, and a short impact summary PDF.';
  }
  if (prompt.includes('claim')) {
    return 'I can guide the full claim form and prefill details from your policy + workflow context.';
  }
  if (prompt.includes('premium') || prompt.includes('quote')) {
    return 'To optimize premium, increase deductible and remove optional endorsements that do not fit your workflow.';
  }
  return 'I can help with coverage interpretation, claim prep, and policy workflow completion.';
}

const Copilot = () => {
  const [searchParams] = useSearchParams();
  const { currentUser, userClaims, userPolicies, createCallRequest } = useAppData();
  const [input, setInput] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [composerFiles, setComposerFiles] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hi ${currentUser?.fullName?.split(' ')[0] || 'there'}, I am Rexy. I can guide policy setup, claims, and evidence collection.`,
    },
  ]);
  const topUploadRef = useRef(null);
  const composerUploadRef = useRef(null);
  const chatWindowRef = useRef(null);

  const claimId = searchParams.get('claim');
  const contextClaim = claimId ? userClaims.find((claim) => claim.id === claimId) : null;
  const contextPolicy = contextClaim ? userPolicies.find((policy) => policy.id === contextClaim.policyId) : null;

  const contextLabel = contextClaim
    ? `Claim ${contextClaim.claimNumber || contextClaim.id} | ${contextPolicy?.policyNumber || 'No policy'} | ${
        contextClaim.workflowName || contextClaim.answers?.workflowName || contextClaim.incidentType || 'Workflow'
      }`
    : 'General support';

  const sendMessage = (nextInput, attachedFiles = []) => {
    const trimmed = nextInput.trim();
    if (!trimmed && attachedFiles.length === 0) return;

    const outgoing = trimmed || 'Sharing evidence files for review.';
    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        sender: 'user',
        text: outgoing,
        attachments: attachedFiles,
      },
    ]);

    setTimeout(() => {
      const response = createRexyReply(outgoing, contextLabel);
      setMessages((previous) => [...previous, { id: Date.now() + 1, sender: 'bot', text: response }]);
    }, 400);
  };

  const handleSend = (event) => {
    event.preventDefault();
    sendMessage(input, composerFiles);
    setInput('');
    setComposerFiles([]);
  };

  const handleQuickPrompt = (prompt) => {
    sendMessage(prompt, []);
  };

  const handleCallRequest = async () => {
    setCallStatus('Submitting...');
    const result = await createCallRequest({
      phone: REXY_PHONE,
      topic: `Copilot request | ${contextLabel}`,
    });

    setCallStatus(
      result.source === 'remote'
        ? `Call request submitted (remote id: ${result.remoteRequestId || 'pending'})`
        : 'Call request queued locally. Start API server for remote submission.'
    );
  };

  const handleTopEvidenceUpload = (event) => {
    const files = Array.from(event.target.files || []).map((file) => file.name);
    if (!files.length) return;

    setUploadStatus(`${files.length} file(s) uploaded to Rexy evidence inbox.`);
    sendMessage('Uploading evidence for claim support.', files);
    event.target.value = '';
  };

  const handleComposerUpload = (event) => {
    const files = Array.from(event.target.files || []).map((file) => file.name);
    if (!files.length) return;

    setComposerFiles((previous) => Array.from(new Set([...previous, ...files])));
    event.target.value = '';
  };

  useEffect(() => {
    if (!chatWindowRef.current) return;
    chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="rexy-shell">
      <header className="dashboard-header">
        <div>
          <h1 className="header-title">Rexy</h1>
        </div>
      </header>

      <section className="card rexy-support-strip">
        <div>
          <h3>Call Rexy: {REXY_PHONE}</h3>
          <p>Call Rexy for claim help, evidence requests, and coverage questions.</p>
        </div>

        <div className="rexy-support-actions">
          <div>
            <button type="button" className="btn-primary" onClick={handleCallRequest}>
              <PhoneCall size={15} />
              Request Call
            </button>

            <input
              ref={topUploadRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              hidden
              onChange={handleTopEvidenceUpload}
            />

            <button type="button" className="btn-secondary" onClick={() => topUploadRef.current?.click()}>
              <Upload size={15} />
              Upload evidence
            </button>
          </div>

          {callStatus ? <small>{callStatus}</small> : null}
          {uploadStatus ? <small>{uploadStatus}</small> : null}
        </div>
      </section>

      <div className="rexy-grid">
        <section className="card rexy-chat-card">
          <div className="card-title rexy-chat-title">
            <span>
              <Bot size={16} color="var(--color-primary)" />
              Rexy Guidance Chat
            </span>
          </div>

          <div className="rexy-context-strip">
            <strong>Context:</strong>
            <span>{contextLabel}</span>
          </div>

          <div className="rexy-quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => handleQuickPrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="rexy-chat-window" ref={chatWindowRef}>
            {messages.map((message) => (
              <div key={message.id} className={`rexy-chat-row ${message.sender}`}>
                <div className={`rexy-chat-bubble ${message.sender}`}>
                  {message.text}
                  {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
                    <ul className="rexy-chat-attachments">
                      {message.attachments.map((file) => (
                        <li key={file}>{file}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {composerFiles.length > 0 ? (
            <div className="rexy-composer-files">
              {composerFiles.map((file) => (
                <span key={file}>{file}</span>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSend} className="rexy-chat-form">
            <input
              ref={composerUploadRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              hidden
              onChange={handleComposerUpload}
            />

            <button
              type="button"
              className="rexy-attach-btn"
              onClick={() => composerUploadRef.current?.click()}
              aria-label="Attach evidence files"
            >
              <Paperclip size={16} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="flow-input"
              placeholder="Ask Rexy about claim coverage, required evidence, or policy setup"
            />

            <button type="submit" className="btn-primary">
              <Send size={15} />
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Copilot;
