/**
 * useChat Hook - Manages chat state and interactions
 *
 * Provides a clean interface for chat functionality with automatic
 * session management, message history, and claim progress tracking.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { sendChatMessage, submitClaim, getSessionState } from "../lib/chatApi";

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'assistant'} role
 * @property {string} content
 * @property {string} timestamp
 * @property {File[]} [attachments]
 */

/**
 * @typedef {Object} ClaimProgress
 * @property {string} [companyName]
 * @property {string} [policyNumber]
 * @property {string} [incidentType]
 * @property {string} [incidentDescription]
 * @property {number} [estimatedCost]
 * @property {boolean} policyVerified
 * @property {string} [policyIssue]
 */

/**
 * Custom hook for managing chat state.
 *
 * @returns {Object} Chat state and methods
 */
export function useChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [claimProgress, setClaimProgress] = useState({
    companyName: null,
    policyNumber: null,
    incidentType: null,
    incidentDescription: null,
    estimatedCost: null,
    policyVerified: false,
    policyIssue: null,
  });

  const messageIdCounter = useRef(0);

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  }, []);

  // Update claim progress from API response
  const updateClaimProgress = useCallback((claimData, policyIssue) => {
    setClaimProgress({
      companyName: claimData?.claimant?.name || null,
      policyNumber: claimData?.claimant?.policy_number || null,
      incidentType: claimData?.incident?.incident_type || null,
      incidentDescription: claimData?.incident?.incident_description || null,
      estimatedCost:
        claimData?.operational_impact?.estimated_liability_cost || null,
      policyVerified: !policyIssue && !!claimData?.claimant?.policy_number,
      policyIssue: policyIssue || null,
    });
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (content, images = []) => {
      if (!content.trim() && images.length === 0) return;

      setError(null);
      setIsLoading(true);

      // Add user message to UI immediately
      const userMessage = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
        attachments: images.length > 0 ? images : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await sendChatMessage(content, sessionId, images);

        // Update session ID if new
        if (!sessionId && response.session_id) {
          setSessionId(response.session_id);
        }

        // Add assistant message
        const assistantMessage = {
          id: generateMessageId(),
          role: "assistant",
          content: response.assistant_message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update claim progress
        updateClaimProgress(response.claim_data, response.policy_issue);

        // Update completion status
        setIsComplete(response.is_complete);

        return response;
      } catch (err) {
        setError(err.message || "Failed to send message");
        // Remove the user message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, generateMessageId, updateClaimProgress]
  );

  // Submit completed claim
  const handleSubmitClaim = useCallback(async () => {
    if (!sessionId || !isComplete) {
      setError("Cannot submit: claim is not complete");
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitClaim(sessionId);
      setSubmitResult(result);

      // Add confirmation message
      const confirmationMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: result.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, confirmationMessage]);

      return result;
    } catch (err) {
      setError(err.message || "Failed to submit claim");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, isComplete, generateMessageId]);

  // Reset chat session
  const resetChat = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setError(null);
    setIsComplete(false);
    setIsSubmitting(false);
    setSubmitResult(null);
    setClaimProgress({
      companyName: null,
      policyNumber: null,
      incidentType: null,
      incidentDescription: null,
      estimatedCost: null,
      policyVerified: false,
      policyIssue: null,
    });
    messageIdCounter.current = 0;
  }, []);

  // Restore session from ID
  const restoreSession = useCallback(
    async (existingSessionId) => {
      try {
        const state = await getSessionState(existingSessionId);
        setSessionId(existingSessionId);

        // Convert API messages to our format
        const formattedMessages = state.messages.map((msg, index) => ({
          id: `restored-${index}`,
          role: msg.role,
          content:
            typeof msg.content === "string"
              ? msg.content
              : msg.content
                  .filter((c) => c.type === "text")
                  .map((c) => c.text)
                  .join(""),
          timestamp: new Date().toISOString(),
        }));
        setMessages(formattedMessages);

        // Update claim progress from extracted fields
        const ef = state.extracted_fields || {};
        setClaimProgress({
          companyName: ef["claimant.name"] || null,
          policyNumber: ef["claimant.policy_number"] || null,
          incidentType: ef.incident_type || null,
          incidentDescription: ef.incident_description || null,
          estimatedCost: ef.estimated_liability_cost || null,
          policyVerified: !!ef["claimant.policy_number"],
          policyIssue: null,
        });

        return state;
      } catch (err) {
        setError(err.message || "Failed to restore session");
        throw err;
      }
    },
    [generateMessageId]
  );

  // Add initial greeting message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: generateMessageId(),
          role: "assistant",
          content:
            "Hi, I'm Sarah from Gana Insurance. I can help you file a claim today. To get started, I'll need your company name (policyholder) and policy number. What name should I use?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [generateMessageId, messages.length]);

  return {
    // State
    sessionId,
    messages,
    isLoading,
    error,
    isComplete,
    isSubmitting,
    submitResult,
    claimProgress,

    // Actions
    sendMessage,
    submitClaim: handleSubmitClaim,
    resetChat,
    restoreSession,
    clearError: () => setError(null),
  };
}

export default useChat;
