import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, User, LogOut, ChevronDown, ChevronUp, Settings, History } from "lucide-react";
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
    
    // Check if date is valid
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
      // Chama o endpoint de logout no backend
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Remove o token e limpa os dados do usuário
      removeAuthToken();
      queryClient.setQueryData(["/api/auth/user"], () => {
        return null;
      });
      queryClient.clear();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      // Redireciona para a página inicial
      setLocation("/");
    }
  };

  return (
    <div className={`${showHistory ? 'w-80' : 'w-20 md:w-32'} bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300`}>
      {/* User Menu - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <div className="relative">
          <button
            className="flex items-center text-sm text-sidebar-foreground hover:text-sidebar-primary focus:outline-none focus:ring-2 focus:ring-sidebar-primary rounded-full p-2"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <User size={20} />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
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

      {/* Header */}
      <div className={`p-4 border-b border-sidebar-border ${!showHistory ? 'px-2' : ''}`}>
        {showHistory ? (
          <div className="flex flex-col items-center text-center mb-4">
            <img 
              src={cabedeloLogo} 
              alt="Câmara Municipal de Cabedelo" 
              className="h-12 mb-3"
            />
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground">Assistente Legislativo</h1>
              <p className="text-xs text-sidebar-foreground/60">Câmara de Cabedelo</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center mb-4">
            <img 
              src={cabedeloLogo} 
              alt="Câmara Municipal de Cabedelo" 
              className="h-8 mb-2"
            />
          </div>
        )}
        <Button
          onClick={onNewConversation}
          className={`w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-sidebar-primary focus:ring-offset-2 transition-colors duration-200 ${!showHistory ? 'px-2 justify-center' : ''}`}
          title="Nova Consulta"
        >
          <Plus className={showHistory ? "mr-2" : ""} size={16} />
          {showHistory && "Nova Consulta"}
        </Button>
      </div>

      {/* History Section */}
      <div className={`flex-1 overflow-y-auto ${showHistory ? 'p-4' : 'p-2'}`}>
        <div className={`flex items-center ${showHistory ? 'justify-between' : 'justify-center'} mb-3`}>
          {showHistory && (
            <h2 className="text-sm font-medium text-sidebar-foreground">Histórico de Conversas</h2>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1 hover:bg-sidebar-accent rounded-sm transition-colors duration-150"
            title={showHistory ? "Ocultar histórico" : "Mostrar histórico"}
          >
            {showHistory ? (
              <ChevronUp size={16} className="text-sidebar-foreground/60" />
            ) : (
              <History size={16} className="text-sidebar-foreground/60" />
            )}
          </button>
        </div>
        
        {showHistory && (
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-md bg-sidebar-accent animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-sidebar-foreground/60 py-8">
                <p className="text-sm">Nenhuma conversa ainda.</p>
                <p className="text-xs mt-1">Inicie uma nova consulta para começar.</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`sidebar-item p-3 rounded-md cursor-pointer transition-colors duration-150 ${
                    currentConversationId === conversation.id ? 'active' : ''
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
                      <div className="font-medium text-sm text-sidebar-foreground truncate">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-sidebar-foreground/60 mt-1">
                        {conversation.date}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {!showHistory && (
          <div className="text-center text-sidebar-foreground/60 py-4">
            <p className="text-xs">Histórico oculto</p>
            <p className="text-xs opacity-70 mt-1">Clique no ícone para mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}