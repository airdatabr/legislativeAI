import { type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage } from "@shared/schema";
import { supabase, testConnection } from "./supabase";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Conversation operations
  createConversation(insertConversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  getConversationWithMessages(conversationId: number, userId: number): Promise<(Conversation & { messages: Message[] }) | undefined>;
  
  // Message operations
  createMessage(insertMessage: InsertMessage): Promise<Message>;
}

export class SupabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(insertUser)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertConversation)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getConversationWithMessages(conversationId: number, userId: number): Promise<(Conversation & { messages: Message[] }) | undefined> {
    // First get the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
    
    if (convError && convError.code !== 'PGRST116') throw convError;
    if (!conversation) return undefined;

    // Then get the messages
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

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(insertMessage)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Test connection on startup
testConnection().then(success => {
  if (success) {
    console.log('[Storage] Supabase connection verified');
  } else {
    console.error('[Storage] Failed to connect to Supabase');
  }
});

export const storage = new SupabaseStorage();