import { supabase } from "./supabase";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  createUser(insertUser: any): Promise<any>;
  getAllUsers(): Promise<any[]>;
  
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
    // Create user with basic fields first
    const { role_id, ...userDataWithoutRole } = insertUser;
    
    const { data, error } = await supabase
      .from('users')
      .insert(userDataWithoutRole)
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Update role_id directly with SQL query if provided
    if (role_id) {
      const updateQuery = `UPDATE users SET role_id = ${role_id} WHERE id = ${data.id}`;
      const { error: updateError } = await supabase.rpc('exec_sql', { query: updateQuery });
      
      if (!updateError) {
        // Fetch updated user data
        const { data: updatedData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.id)
          .single();
        
        return { 
          ...updatedData, 
          role: (role_id === 1) ? 'admin' : 'user' 
        };
      }
    }
    
    return { 
      ...data, 
      role_id: 2,
      role: 'user' 
    };
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
    try {
      // Try direct SQL query first
      const result = await supabase.rpc('get_roles');
      if (result.data) {
        return result.data;
      }
    } catch (error) {
      console.error('RPC error:', error);
    }
    
    // Fallback to static roles
    return [
      { id: 1, name: 'admin', description: 'Administrador do sistema com acesso total' },
      { id: 2, name: 'user', description: 'Usuário comum com acesso ao chat legislativo' }
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Add role information based on role_id
    return (data || []).map(user => ({
      ...user,
      role: user.role_id === 1 ? 'admin' : 'user'
    }));
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
}

export const storage = new DirectStorage();