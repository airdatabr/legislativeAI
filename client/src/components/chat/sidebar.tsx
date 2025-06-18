import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, User, LogOut, History, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { removeAuthToken, getAuthToken } from "@/lib/auth-utils";
import { useLocation } from "wouter";
import cabedeloLogo from "@/assets/cabedelo-logo.png";

interface Conversation {
  id: number;
  title: string;
  date: string;
  query_type?: string;
}

interface SidebarProps {
  onNewConversation: () => void;
  onConversationSelect: (conversationId: number) => void;
  currentConversationId: number | null;
  refreshTrigger: number;
}

export default function Sidebar({ 
  onNewConversation, 
  onConversationSelect, 
  currentConversationId,
  refreshTrigger 
}: SidebarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/chat/history", refreshTrigger],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) return [];

      const response = await fetch('/api/chat/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      return data.map((conv: any) => ({
        ...conv,
        date: formatDate(conv.date)
      }));
    }
  });

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return 'Data não disponível';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      removeAuthToken();
      queryClient.setQueryData(["/api/auth/user"], () => {
        return null;
      });
      queryClient.clear();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      setLocation("/");
    }
  };

  return (
    <div className={`${showHistory ? 'w-80' : 'w-16'} bg-gray-50 border-l border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Header with toggle */}
      <div className="p-3 border-b border-gray-200">
        <div className={`flex items-center ${showHistory ? 'justify-between' : 'justify-center'}`}>
          {showHistory && (
            <div className="flex items-center space-x-2">
              <img 
                src={cabedeloLogo} 
                alt="Câmara Municipal de Cabedelo" 
                className="h-6"
              />
              <span className="text-sm font-medium text-gray-900">Histórico</span>
            </div>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title={showHistory ? "Ocultar histórico" : "Mostrar histórico"}
          >
            <History size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      {showHistory ? (
        <div className="p-3 border-b border-gray-200">
          <Button
            onClick={onNewConversation}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 text-sm font-medium"
          >
            <Plus className="mr-2" size={16} />
            Nova Consulta
          </Button>
        </div>
      ) : (
        <div className="p-2 border-b border-gray-200">
          <button
            onClick={onNewConversation}
            className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Nova Consulta"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {showHistory && (
          <div className="p-3 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-200 animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">Nenhuma conversa ainda.</p>
                <p className="text-xs mt-1">Inicie uma nova consulta para começar.</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-200 ${
                    currentConversationId === conversation.id ? 'bg-blue-100 border border-blue-200' : 'bg-white'
                  }`}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        conversation.query_type === 'laws' 
                          ? 'bg-yellow-500' 
                          : 'bg-blue-500'
                      }`}
                      title={conversation.query_type === 'laws' ? 'Base de Leis' : 'Internet'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {conversation.date}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* User Menu at bottom */}
      <div className="mt-auto p-3 border-t border-gray-200">
        <div className="relative">
          <button
            className={`w-full flex items-center ${showHistory ? 'justify-start px-3' : 'justify-center'} py-2 hover:bg-gray-200 rounded-lg transition-colors`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <User size={20} className="text-gray-600" />
            {showHistory && (
              <span className="ml-2 text-sm text-gray-700 truncate">
                {user?.name || "Usuário"}
              </span>
            )}
          </button>
          {showUserMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="py-1">
                <div className="px-4 py-2 text-sm text-gray-500 border-b">
                  {user?.name || "Usuário"}
                </div>
                {user?.role === 'admin' && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => {
                      setShowUserMenu(false);
                      setLocation('/admin');
                    }}
                  >
                    <Settings className="mr-2" size={16} />
                    Painel Administrativo
                  </button>
                )}
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2" size={16} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}