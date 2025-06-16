import { supabase } from "./supabase";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  createUser(insertUser: any): Promise<any>;
  
  // Conversation operations
  createConversation(insertConversation: any): Promise<any>;
  getUserConversations(userId: number): Promise<any[]>;
  getConversationWithMessages(conversationId: number, userId: number): Promise<any>;
  
  // Message operations
  createMessage(insertMessage: any): Promise<any>;
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
    const { data, error } = await supabase
      .from('users')
      .insert(insertUser)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
}

export const storage = new DirectStorage();