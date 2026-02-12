/**
 * ChatClaim Page - File a claim via chat with Sarah
 *
 * This page provides the chat-based claim intake experience,
 * integrating with the Gana Insurance FastAPI backend.
 */

import { ChatInterface } from "../../components/ChatInterface";

export function ChatClaim() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">File a Claim</h1>
          <p className="text-sm text-muted-foreground">
            Chat with Sarah to quickly file your insurance claim
          </p>
        </div>
      </div>

      {/* Chat interface */}
      <div className="flex-1 p-6 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}

export default ChatClaim;
