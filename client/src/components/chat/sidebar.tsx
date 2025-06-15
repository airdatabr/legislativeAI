import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, User, LogOut, ChevronDown } from "lucide-react";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const handleLogout = () => {
    removeAuthToken();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    setLocation("/login");
  };

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img 
              src={cabedeloLogo} 
              alt="Câmara Municipal de Cabedelo" 
              className="h-8 mr-3"
            />
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground">Assistente Legislativo</h1>
              <p className="text-xs text-sidebar-foreground/60">Câmara de Cabedelo</p>
            </div>
          </div>
          <div className="relative">
            <button
              className="flex items-center text-sm text-sidebar-foreground hover:text-sidebar-primary focus:outline-none focus:ring-2 focus:ring-sidebar-primary rounded-full p-1"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <User className="text-lg mr-2" size={20} />
              <span>{user?.name || "Usuário"}</span>
              <ChevronDown className="ml-2" size={16} />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
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
        <Button
          onClick={onNewConversation}
          className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-sidebar-primary focus:ring-offset-2 transition-colors duration-200"
        >
          <Plus className="mr-2" size={16} />
          Nova Consulta
        </Button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-medium text-sidebar-foreground mb-3">Histórico de Conversas</h2>
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
                <div className="font-medium text-sm text-sidebar-foreground truncate">
                  {conversation.title}
                </div>
                <div className="text-xs text-sidebar-foreground/60 mt-1">
                  {conversation.date}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
