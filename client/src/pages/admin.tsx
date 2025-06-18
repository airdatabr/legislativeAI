import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken, removeAuthToken } from "@/lib/auth-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, BarChart3, MessageSquare, Calendar, Edit, Trash2, Save, X, Settings, Key, Eye, EyeOff, ArrowLeft, LogOut } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role_id: z.number().int().positive("Função é obrigatória"),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("users");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [envVars, setEnvVars] = useState<{[key: string]: string}>({});

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role_id: 2, // Default to 'user' role
    },
  });

  // Navigation functions
  const handleBackToChat = () => {
    setLocation('/');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      
      removeAuthToken();
      queryClient.clear();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive",
      });
    }
  };

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores podem acessar esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [user, authLoading, toast]);

  // Queries with proper typing
  const { data: roles = [], isLoading: rolesLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/roles'],
    enabled: user?.role === 'admin',
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.role === 'admin',
  });

  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const { data: userStats = [], isLoading: userStatsLoading } = useQuery({
    queryKey: ['/api/admin/user-stats'],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      const response = await fetch('/api/admin/user-stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    }
  });

  const { data: envSettings = {}, isLoading: envLoading } = useQuery({
    queryKey: ['/api/admin/env-settings'],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      const response = await fetch('/api/admin/env-settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch environment settings');
      return response.json();
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar usuário');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário Criado",
        description: "Novo usuário foi criado com sucesso.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Criar Usuário",
        description: error.message || "Ocorreu um erro ao criar o usuário.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir usuário');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário Excluído",
        description: "O usuário foi excluído com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Excluir Usuário",
        description: error.message || "Ocorreu um erro ao excluir o usuário.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number; userData: any }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar usuário');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário Atualizado",
        description: "O usuário foi atualizado com sucesso.",
      });
      setEditingUserId(null);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Atualizar Usuário",
        description: error.message || "Ocorreu um erro ao atualizar o usuário.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditingUser({
      name: user.name,
      email: user.email,
      role_id: user.role_id
    });
  };

  const handleSaveUser = () => {
    if (editingUserId && editingUser) {
      updateUserMutation.mutate({ userId: editingUserId, userData: editingUser });
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUser(null);
  };

  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Environment variables mutation
  const updateEnvMutation = useMutation({
    mutationFn: async (envData: { [key: string]: string }) => {
      const response = await fetch('/api/admin/env-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(envData)
      });
      if (!response.ok) throw new Error('Failed to update environment variables');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Variáveis de ambiente atualizadas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/env-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Atualizar Configurações",
        description: error.message || "Ocorreu um erro ao atualizar as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleEnvUpdate = (key: string, value: string) => {
    setEnvVars(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveEnvSettings = () => {
    updateEnvMutation.mutate(envVars);
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Initialize environment variables when data loads
  useEffect(() => {
    if (envSettings && Object.keys(envSettings).length > 0) {
      setEnvVars(envSettings);
    }
  }, [envSettings]);

  // Server restart mutation
  const restartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/restart-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to restart server');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Servidor Reiniciado",
        description: "O servidor foi reiniciado com sucesso! As novas configurações estão ativas.",
      });
      // Reload the page after a short delay to reconnect
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Reiniciar Servidor",
        description: error.message || "Ocorreu um erro ao reiniciar o servidor.",
        variant: "destructive",
      });
    },
  });

  const handleRestartServer = () => {
    if (window.confirm('Tem certeza que deseja reiniciar o servidor? Isso aplicará todas as configurações salvas.')) {
      restartMutation.mutate();
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Acesso negado</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Painel Administrativo
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Gerenciar usuários e visualizar relatórios do sistema
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleBackToChat}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Chat
            </Button>
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="create-user" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Criar Usuário
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>
                Todos os usuários cadastrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-4">Carregando usuários...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => {
                      // Encontrar o role correspondente para exibir o nome correto
                      const userRole = Array.isArray(roles) ? roles.find((role: any) => role.id === user.role_id) : null;
                      const roleName = userRole?.name || user.role || 'Usuário';
                      
                      const isEditing = editingUserId === user.id;
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {isEditing ? (
                              <Input
                                value={editingUser?.name || ''}
                                onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                                className="w-full"
                              />
                            ) : (
                              user.name
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={editingUser?.email || ''}
                                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                className="w-full"
                                type="email"
                              />
                            ) : (
                              user.email
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editingUser?.role_id?.toString() || ''}
                                onValueChange={(value) => setEditingUser({...editingUser, role_id: parseInt(value)})}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione uma função" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.isArray(roles) && roles.map((role: any) => (
                                    <SelectItem key={role.id} value={role.id.toString()}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={user.role_id === 1 ? 'destructive' : 'default'}>
                                {roleName}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSaveUser}
                                    disabled={updateUserMutation.isPending}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={user.id === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create User Tab */}
        <TabsContent value="create-user" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Usuário</CardTitle>
              <CardDescription>
                Adicionar um novo usuário ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o email" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite a senha" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a função do usuário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rolesLoading ? (
                              <SelectItem value="" disabled>Carregando...</SelectItem>
                            ) : roles && Array.isArray(roles) && roles.length > 0 ? (
                              roles.map((role: any) => (
                                <SelectItem key={role.id} value={role.id.toString()}>
                                  {role.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="1">Administrador</SelectItem>
                                <SelectItem value="2">Usuário</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.total_users || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.total_conversations || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Mensagens</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.total_messages || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Most Active Users */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários Mais Ativos</CardTitle>
              <CardDescription>
                Usuários com mais conversas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-center py-4">Carregando estatísticas...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Conversas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.most_active_users?.map((user: any) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Gerencie as variáveis de ambiente e configurações da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {envLoading ? (
                <div className="text-center py-8">
                  <div className="text-lg">Carregando configurações...</div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Organization Branding Configuration Card */}
                  <Card className="border-indigo-200 dark:border-indigo-800">
                    <CardHeader className="bg-indigo-50 dark:bg-indigo-950 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                        <Settings className="h-5 w-5" />
                        Identidade Visual do Órgão
                      </CardTitle>
                      <CardDescription className="text-indigo-600 dark:text-indigo-300">
                        Personalize o nome e logomarca exibidos no sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Nome do Órgão</Label>
                        <Input
                          id="org-name"
                          type="text"
                          value={envVars['ORG_NAME'] || ''}
                          onChange={(e) => handleEnvUpdate('ORG_NAME', e.target.value)}
                          placeholder="Câmara Municipal de Cabedelo"
                        />
                        <p className="text-sm text-gray-500">
                          Nome oficial da instituição que será exibido no cabeçalho
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-title">Título do Sistema</Label>
                        <Input
                          id="org-title"
                          type="text"
                          value={envVars['ORG_TITLE'] || ''}
                          onChange={(e) => handleEnvUpdate('ORG_TITLE', e.target.value)}
                          placeholder="Assistente Legislativo"
                        />
                        <p className="text-sm text-gray-500">
                          Título principal do sistema exibido no cabeçalho
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-logo">URL da Logomarca</Label>
                        <Input
                          id="org-logo"
                          type="text"
                          value={envVars['ORG_LOGO_URL'] || ''}
                          onChange={(e) => handleEnvUpdate('ORG_LOGO_URL', e.target.value)}
                          placeholder="https://example.com/logo.png ou /assets/logo.png"
                        />
                        <p className="text-sm text-gray-500">
                          URL da imagem da logomarca (PNG, JPG ou SVG recomendado)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* OpenAI Configuration Card */}
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="bg-blue-50 dark:bg-blue-950 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                        <Key className="h-5 w-5" />
                        OpenAI - Inteligência Artificial
                      </CardTitle>
                      <CardDescription className="text-blue-600 dark:text-blue-300">
                        Configurações para funcionalidades de IA e processamento de linguagem natural
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="space-y-2">
                        <Label htmlFor="openai-key">Chave da API OpenAI</Label>
                        <div className="flex gap-2">
                          <Input
                            id="openai-key"
                            type={showPasswords['OPENAI_API_KEY'] ? 'text' : 'password'}
                            value={envVars['OPENAI_API_KEY'] || ''}
                            onChange={(e) => handleEnvUpdate('OPENAI_API_KEY', e.target.value)}
                            placeholder="sk-..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => togglePasswordVisibility('OPENAI_API_KEY')}
                          >
                            {showPasswords['OPENAI_API_KEY'] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Chave necessária para as funcionalidades de IA do assistente legislativo
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Supabase Configuration Card */}
                  <Card className="border-green-200 dark:border-green-800">
                    <CardHeader className="bg-green-50 dark:bg-green-950 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <Settings className="h-5 w-5" />
                        Supabase - Banco de Dados
                      </CardTitle>
                      <CardDescription className="text-green-600 dark:text-green-300">
                        Configurações de conexão com o banco de dados PostgreSQL
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="space-y-2">
                        <Label htmlFor="supabase-url">URL do Projeto Supabase</Label>
                        <Input
                          id="supabase-url"
                          type="text"
                          value={envVars['SUPABASE_URL'] || ''}
                          onChange={(e) => handleEnvUpdate('SUPABASE_URL', e.target.value)}
                          placeholder="https://projectref.supabase.co"
                        />
                        <p className="text-sm text-gray-500">
                          URL base do seu projeto Supabase (Project Settings &gt; API)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supabase-key">Chave Anônima do Supabase</Label>
                        <div className="flex gap-2">
                          <Input
                            id="supabase-key"
                            type={showPasswords['SUPABASE_KEY'] ? 'text' : 'password'}
                            value={envVars['SUPABASE_KEY'] || ''}
                            onChange={(e) => handleEnvUpdate('SUPABASE_KEY', e.target.value)}
                            placeholder="eyJ..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => togglePasswordVisibility('SUPABASE_KEY')}
                          >
                            {showPasswords['SUPABASE_KEY'] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Chave anônima pública para acesso ao Supabase (Project Settings &gt; API)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Authentication Configuration Card */}
                  <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader className="bg-purple-50 dark:bg-purple-950 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                        <Key className="h-5 w-5" />
                        Autenticação e Segurança
                      </CardTitle>
                      <CardDescription className="text-purple-600 dark:text-purple-300">
                        Configurações de segurança e autenticação JWT
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="space-y-2">
                        <Label htmlFor="jwt-secret">Chave Secreta JWT</Label>
                        <div className="flex gap-2">
                          <Input
                            id="jwt-secret"
                            type={showPasswords['JWT_SECRET'] ? 'text' : 'password'}
                            value={envVars['JWT_SECRET'] || ''}
                            onChange={(e) => handleEnvUpdate('JWT_SECRET', e.target.value)}
                            placeholder="Digite uma chave secreta segura com pelo menos 32 caracteres..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => togglePasswordVisibility('JWT_SECRET')}
                          >
                            {showPasswords['JWT_SECRET'] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Chave usada para assinar tokens JWT de autenticação (mantenha secreta)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Laws API Configuration Card */}
                  <Card className="border-orange-200 dark:border-orange-800">
                    <CardHeader className="bg-orange-50 dark:bg-orange-950 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                        <MessageSquare className="h-5 w-5" />
                        API de Legislação Municipal
                      </CardTitle>
                      <CardDescription className="text-orange-600 dark:text-orange-300">
                        Configurações para integração com a base de dados de leis municipais
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="space-y-2">
                        <Label htmlFor="laws-api-url">URL da API de Leis</Label>
                        <Input
                          id="laws-api-url"
                          type="text"
                          value={envVars['INTERNAL_LAWS_API_URL'] || ''}
                          onChange={(e) => handleEnvUpdate('INTERNAL_LAWS_API_URL', e.target.value)}
                          placeholder="https://api.openai.com/v1/chat/completions (para teste)"
                        />
                        <p className="text-sm text-gray-500">
                          URL do endpoint da API interna de legislação municipal
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="laws-api-key">Chave da API de Leis</Label>
                        <div className="flex gap-2">
                          <Input
                            id="laws-api-key"
                            type={showPasswords['INTERNAL_LAWS_API_KEY'] ? 'text' : 'password'}
                            value={envVars['INTERNAL_LAWS_API_KEY'] || ''}
                            onChange={(e) => handleEnvUpdate('INTERNAL_LAWS_API_KEY', e.target.value)}
                            placeholder="Chave de autenticação da API..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => togglePasswordVisibility('INTERNAL_LAWS_API_KEY')}
                          >
                            {showPasswords['INTERNAL_LAWS_API_KEY'] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Chave de autenticação para acessar a API de legislação (opcional)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleRestartServer}
                        disabled={restartMutation.isPending}
                        variant="outline"
                        className="min-w-[120px]"
                      >
                        {restartMutation.isPending ? "Reiniciando..." : "Reiniciar Servidor"}
                      </Button>
                    </div>
                    <Button 
                      onClick={handleSaveEnvSettings}
                      disabled={updateEnvMutation.isPending}
                      className="min-w-[120px]"
                    >
                      {updateEnvMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}