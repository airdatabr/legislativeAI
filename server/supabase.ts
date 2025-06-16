import { createClient } from '@supabase/supabase-js'

// Obtenha as credenciais do Supabase das variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_KEY devem estar definidas nas variáveis de ambiente')
}

// Crie o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Define se o cliente deve persistir sessões (útil para aplicações server-side)
    persistSession: false,
    // Auto refresh token para manter a sessão ativa
    autoRefreshToken: true,
  },
  // Configurações adicionais opcionais
  global: {
    // Headers customizados para todas as requisições
    headers: { 'x-application-name': 'assistente-legislativo' },
  },
  // Timeout para requisições
  db: {
    schema: 'public', // Schema padrão do banco
  },
})

// Função para testar a conexão
export async function testConnection() {
  try {
    // Tenta fazer uma query simples para verificar a conexão
    const { data, error } = await supabase
      .from('users') // Tabela users existente
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Erro ao conectar com o Supabase:', error.message)
      return false
    }
    
    console.log('Conexão com Supabase estabelecida com sucesso!')
    return true
  } catch (err) {
    console.error('Erro inesperado:', err)
    return false
  }
}

// Database operations using Supabase client
export class SupabaseStorage {
  // User operations
  async getUser(id: number) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return data
  }

  async createUser(insertUser: any) {
    const { data, error } = await supabase
      .from('users')
      .insert(insertUser)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Conversation operations
  async createConversation(insertConversation: any) {
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertConversation)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getUserConversations(userId: number) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  async getConversationWithMessages(conversationId: number, userId: number) {
    // First get the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('userId', userId)
      .single()
    
    if (convError) throw convError
    if (!conversation) return undefined

    // Then get the messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true })
    
    if (msgError) throw msgError

    return {
      ...conversation,
      messages: messages || []
    }
  }

  // Message operations
  async createMessage(insertMessage: any) {
    const { data, error } = await supabase
      .from('messages')
      .insert(insertMessage)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}