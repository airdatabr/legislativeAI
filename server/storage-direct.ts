import { supabase } from "./supabase";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  createUser(insertUser: any): Promise<any>;
  getAllUsers(): Promise<any[]>;
  updateUser(id: number, userData: any): Promise<any>;
  deleteUser(id: number): Promise<void>;
  
  // Role operations
  getAllRoles(): Promise<any[]>;
  getRoleById(id: number): Promise<any>;
  
  // Conversation operations
  createConversation(insertConversation: any): Promise<any>;
  getUserConversations(userId: number): Promise<any[]>;
  getConversationWithMessages(conversationId: number, userId: number): Promise<any>;
  
  // Message operations
  createMessage(insertMessage: any): Promise<any>;
  
  // Admin operations
  getUserStats(): Promise<any>;
  getUsageStats(): Promise<any>;
}

export class DirectStorage implements IStorage {
  async getUser(id: number) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async createUser(insertUser: any) {
    try {
      // Use SQL function to bypass PostgREST cache issues
      const { data: userData, error: userError } = await supabase.rpc('create_user_with_role', {
        p_name: insertUser.name,
        p_email: insertUser.email,
        p_password: insertUser.password,
        p_role_id: insertUser.role_id
      });
      
      if (userError) {
        throw userError;
      }
      
      // Return the first row from the function result
      const user = Array.isArray(userData) ? userData[0] : userData;
      
      // Add role name for convenience
      return { 
        ...user, 
        role: user.role_id === 1 ? 'admin' : 'user' 
      };
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  async createConversation(insertConversation: any) {
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertConversation)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserConversations(userId: number) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getConversationWithMessages(conversationId: number, userId: number) {
    // Get the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    
    if (convError && convError.code !== 'PGRST116') throw convError;
    if (!conversation) return undefined;

    // Get the messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (msgError) throw msgError;

    return {
      ...conversation,
      messages: messages || []
    };
  }

  async createMessage(insertMessage: any) {
    const { data, error } = await supabase
      .from('messages')
      .insert(insertMessage)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getAllRoles() {
    // Use SQL function to get properly formatted role names
    const { data, error } = await supabase.rpc('get_roles_list');
    
    if (!error && data && data.length > 0) {
      return data;
    }
    
    // If function fails, return the correct database values with proper formatting
    return [
      { id: 1, name: 'Administrador', description: 'Administrador do sistema com acesso total' },
      { id: 2, name: 'Usuário', description: 'Usuário comum com acesso ao chat legislativo' }
    ];
  }

  async getRoleById(id: number) {
    const { data, error } = await supabase
      .from('role')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getAllUsers() {
    // Get users and roles separately to avoid cache issues
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userError) throw userError;
    
    const roles = await this.getAllRoles();
    
    return (userData || []).map(user => {
      const userRole = roles.find((r: any) => r.id === user.role_id);
      return {
        ...user,
        role: userRole?.name || (user.role_id === 1 ? 'admin' : 'user')
      };
    });
  }

  async getUserStats() {
    // Get user statistics with conversation and message counts
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role_id,
        created_at
      `);
    
    if (error) throw error;
    
    // Get conversation counts for each user
    const usersWithStats = await Promise.all((data || []).map(async (user) => {
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', 
          (await supabase.from('conversations').select('id').eq('user_id', user.id)).data?.map(c => c.id) || []
        );
      
      return {
        ...user,
        role: user.role_id === 1 ? 'admin' : 'user',
        conversation_count: convCount || 0,
        message_count: msgCount || 0
      };
    }));
    
    return usersWithStats;
  }

  async getUsageStats() {
    // Get overall usage statistics
    const { count: totalUsers, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalConversations, error: convError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalMessages, error: msgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    // Get most active users by conversation count
    const { data: conversationCounts, error: activeError } = await supabase
      .from('conversations')
      .select('user_id, users!inner(name, email)')
      .order('created_at', { ascending: false });

    if (userError || convError || msgError || activeError) {
      throw userError || convError || msgError || activeError;
    }

    // Process most active users
    const userActivity: { [key: number]: { name: string; email: string; count: number } } = {};
    
    conversationCounts?.forEach(conv => {
      const userId = conv.user_id;
      const user = conv.users;
      if (userActivity[userId]) {
        userActivity[userId].count++;
      } else {
        userActivity[userId] = {
          name: user.name,
          email: user.email,
          count: 1
        };
      }
    });

    const mostActiveUsers = Object.entries(userActivity)
      .map(([userId, data]) => ({ user_id: parseInt(userId), ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_users: totalUsers || 0,
      total_conversations: totalConversations || 0,
      total_messages: totalMessages || 0,
      most_active_users: mostActiveUsers
    };
  }

  async updateUser(id: number, userData: any): Promise<any> {
    try {
      // First verify user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

      if (!existingUser) {
        throw new Error("Usuário não encontrado");
      }

      // Update using simple approach
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: userData.name,
          email: userData.email,
          role_id: userData.role_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error("Error updating user:", updateError);
        throw new Error("Erro ao atualizar usuário");
      }

      // Fetch updated user data
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('id, name, email, role_id, created_at, updated_at')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error("Error fetching updated user:", fetchError);
        throw new Error("Erro ao buscar usuário atualizado");
      }

      return updatedUser;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    // First, delete related messages for this user's conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', id);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(conv => conv.id);
      
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);

      if (messagesError) {
        console.error("Error deleting user messages:", messagesError);
        throw new Error("Erro ao excluir mensagens do usuário");
      }
    }

    // Then delete conversations
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', id);

    if (conversationsError) {
      console.error("Error deleting user conversations:", conversationsError);
      throw new Error("Erro ao excluir conversas do usuário");
    }

    // Finally delete the user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (userError) {
      console.error("Error deleting user:", userError);
      throw new Error("Erro ao excluir usuário");
    }
  }
}

export const storage = new DirectStorage();