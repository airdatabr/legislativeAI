import { useState } from "react";
import Sidebar from "@/components/chat/sidebar";
import ChatArea from "@/components/chat/chat-area";

export default function ChatPage() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleConversationSelect = (conversationId: number) => {
    setCurrentConversationId(conversationId);
  };

  const handleMessageSent = (conversationId: number) => {
    if (currentConversationId !== conversationId) {
      setCurrentConversationId(conversationId);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-screen bg-white">
      <ChatArea
        conversationId={currentConversationId}
        onMessageSent={handleMessageSent}
        onNewConversation={handleNewConversation}
        refreshTrigger={refreshTrigger}
      />
      <Sidebar
        onNewConversation={handleNewConversation}
        onConversationSelect={handleConversationSelect}
        currentConversationId={currentConversationId}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
