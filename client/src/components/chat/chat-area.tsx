import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Info, Globe, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import Message from "./message";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatAreaProps {
  conversationId: number | null;
  onMessageSent: (conversationId: number) => void;
  refreshTrigger: number;
}

export default function ChatArea({ conversationId, onMessageSent, refreshTrigger }: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [queryType, setQueryType] = useState<'internet' | 'laws'>('internet');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversation, isLoading, refetch } = useQuery({
    queryKey: ["/api/chat/history", conversationId, refreshTrigger],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`/api/chat/history/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      return response.json();
    },
    enabled: !!conversationId
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { question: string; conversationId?: number; queryType: 'internet' | 'laws' }) => {
      const response = await apiRequest('POST', '/api/chat/query', messageData);
      return response.json();
    },
    onSuccess: (data) => {
      onMessageSent(data.conversation_id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", data.conversation_id] });
      setMessage("");
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível processar sua consulta. Tente novamente.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;

    setIsGenerating(true);
    sendMessageMutation.mutate({
      message: message.trim(),
      conversationId: conversationId || undefined,
      queryType: queryType
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, isGenerating]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const messages: ChatMessage[] = conversation?.messages || [];

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {conversation ? conversation.title : "Consulta Legislativa"}
        </h2>
        
        {/* Query Type Selector */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                queryType === 'internet' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setQueryType('internet')}
            >
              <Globe className="w-4 h-4 mr-1.5" />
              Internet
            </button>
            <button
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                queryType === 'laws' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setQueryType('laws')}
            >
              <BookOpen className="w-4 h-4 mr-1.5" />
              Base de Leis
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            {queryType === 'internet' 
              ? 'Consulta geral sobre legislação'
              : 'Base de leis municipais de Cabedelo'
            }
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando conversa...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="text-primary" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Bem-vindo ao Assistente Legislativo
              </h3>
              <p className="text-gray-600 text-sm">
                Faça perguntas sobre leis, decretos e portarias municipais. 
                O assistente fornecerá informações precisas com referências legais.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <Message
              key={index}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))
        )}

        {/* Loading Indicator */}
        {isGenerating && (
          <div className="message-bubble flex justify-start">
            <div className="max-w-4xl bg-white p-4 rounded-lg rounded-bl-none shadow-sm border border-gray-200">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3 typing-indicator">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center text-gray-500 text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="ml-3">Processando sua consulta...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre legislação municipal..."
              className="min-h-[80px] max-h-[200px] resize-none focus:ring-primary focus:border-primary"
              disabled={isGenerating}
            />
          </div>
          <Button
            type="submit"
            disabled={!message.trim() || isGenerating}
            className="px-6 py-3 bg-primary text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200 self-end"
          >
            <Send size={16} />
            <span className="ml-2 hidden sm:inline">Enviar</span>
          </Button>
        </form>
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <Info className="mr-1" size={12} />
          Pressione Shift+Enter para quebrar linha ou Enter para enviar
        </div>
      </div>
    </div>
  );
}
