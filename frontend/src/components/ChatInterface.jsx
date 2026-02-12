/**
 * ChatInterface Component - Insurance Claim Chat UI
 *
 * Full-featured chat interface for interacting with Sarah,
 * the Gana Insurance AI claims specialist.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "../hooks/useChat";
import { Send, Paperclip, X, Loader2, CheckCircle2, AlertCircle, FileImage, RotateCcw } from "lucide-react";

// ============================================================================
// ClaimProgressCard - Shows real-time claim field status
// ============================================================================
function ClaimProgressCard({ progress, isComplete }) {
  const fields = [
    { label: "Company", value: progress.companyName, key: "company" },
    { label: "Policy #", value: progress.policyNumber, key: "policy" },
    { label: "Incident", value: progress.incidentType, key: "type" },
    { label: "Est. Cost", value: progress.estimatedCost ? `$${progress.estimatedCost.toLocaleString()}` : null, key: "cost" },
  ];

  const filledCount = fields.filter((f) => f.value).length;
  const percentage = Math.round((filledCount / fields.length) * 100);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Claim Progress</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          isComplete ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        }`}>
          {isComplete ? "Ready to Submit" : `${percentage}%`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isComplete ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Field list */}
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{field.label}</span>
            {field.value ? (
              <span className="font-medium text-foreground truncate max-w-[150px]" title={field.value}>
                {field.value}
              </span>
            ) : (
              <span className="text-muted-foreground/50 italic">Pending...</span>
            )}
          </div>
        ))}
      </div>

      {/* Policy verification status */}
      {progress.policyIssue && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {progress.policyIssue === "policy_not_found"
              ? "Policy not found - please verify"
              : "Name doesn't match policy - please verify"}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MessageBubble - Individual chat message
// ============================================================================
function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : ""}`}>
        {/* Avatar for assistant */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xs text-white font-medium">S</span>
            </div>
            <span className="text-xs text-muted-foreground">Sarah</span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

          {/* Attachments indicator */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs opacity-75">
              <FileImage className="h-3 w-3" />
              <span>{message.attachments.length} image(s) attached</span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? "text-right" : ""}`}>
          {time}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ChatInput - Message input with file attachment
// ============================================================================
function ChatInput({ onSend, isLoading, disabled }) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!message.trim() && files.length === 0) || isLoading || disabled) return;

    onSend(message, files);
    setMessage("");
    setFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imageFiles].slice(0, 5)); // Max 5 images
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-4">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {files.map((file, index) => (
            <div key={index} className="relative flex-shrink-0">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-16 w-16 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || disabled}
          className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          title="Attach images"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Message input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Chat ended" : "Type your message..."}
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={(!message.trim() && files.length === 0) || isLoading || disabled}
          className="flex-shrink-0 p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// SubmitClaimButton - Button to submit completed claim
// ============================================================================
function SubmitClaimButton({ onSubmit, isSubmitting, isComplete, submitResult }) {
  if (submitResult) {
    return (
      <div className="p-4 bg-green-50 border-t border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Claim Submitted Successfully</p>
            <p className="text-sm text-green-600">Claim ID: {submitResult.claim_id}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isComplete) return null;

  return (
    <div className="p-4 bg-blue-50 border-t border-blue-200">
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Submitting Claim...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Submit Claim
          </>
        )}
      </button>
      <p className="text-xs text-blue-600 text-center mt-2">
        Review your claim details above, then click to submit for processing.
      </p>
    </div>
  );
}

// ============================================================================
// ChatInterface - Main component
// ============================================================================
export function ChatInterface() {
  const {
    messages,
    isLoading,
    error,
    isComplete,
    isSubmitting,
    submitResult,
    claimProgress,
    sendMessage,
    submitClaim,
    resetChat,
    clearError,
  } = useChat();

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    (message, files) => {
      sendMessage(message, files).catch(() => {
        // Error is handled in the hook
      });
    },
    [sendMessage]
  );

  const handleSubmit = useCallback(() => {
    submitClaim().catch(() => {
      // Error is handled in the hook
    });
  }, [submitClaim]);

  return (
    <div className="flex h-full gap-4">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-background rounded-lg border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-sm text-white font-semibold">S</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Sarah</h2>
              <p className="text-xs text-muted-foreground">Claims Specialist</p>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Start new conversation"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-xs text-white font-medium">S</span>
              </div>
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Submit button (when complete) */}
        <SubmitClaimButton
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isComplete={isComplete}
          submitResult={submitResult}
        />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          disabled={!!submitResult}
        />
      </div>

      {/* Side panel - Claim Progress */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <ClaimProgressCard
          progress={claimProgress}
          isComplete={isComplete}
        />

        {/* Quick info */}
        <div className="mt-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">How it works</h3>
          <ol className="text-xs text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">1.</span>
              Provide your company name and policy number
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">2.</span>
              Describe the incident and estimated costs
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">3.</span>
              Attach any supporting images (optional)
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">4.</span>
              Review and submit your claim
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
