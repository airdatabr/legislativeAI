import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { removeAuthToken, getAuthToken } from "@/lib/auth-utils";
import { useLocation } from "wouter";

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
  onConversationSelect, 
  currentConversationId,
  refreshTrigger 
}: SidebarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
    <>
      {/* Menu Button - Positioned below header */}
      <div className="fixed top-20 left-4 z-50">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-colors"
          title="Menu"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>

      {/* User Menu - Top Right Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <button
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-colors"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <User size={20} className="text-gray-600" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
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

      {/* Sidebar Panel */}
      <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-100 h-full flex flex-col overflow-hidden border-r border-gray-200`}>
        {/* Sidebar Content */}
        {showHistory && (
          <div className="flex flex-col h-full pt-20 px-4">
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Histórico</h2>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3">
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
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-200 ${
                        currentConversationId === conversation.id ? 'bg-gray-200' : 'bg-transparent'
                      }`}
                      onClick={() => {
                        onConversationSelect(conversation.id);
                      }}
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
                          <div className="font-medium text-sm text-gray-800 truncate">
                            {conversation.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {conversation.date}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}