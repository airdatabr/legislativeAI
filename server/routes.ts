import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "./storage-direct";
import { loginSchema, chatQuerySchema, createUserSchema } from "@shared/schema";
import { generateLegislativeResponse, generateConversationTitle, generateLawsResponse } from "./openai";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// JWT middleware
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido' });
  }
}

// Admin middleware
async function requireAdmin(req: any, res: any, next: any) {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' });
    }
    
    // Get user with role information
    const userWithRole = await storage.getUser(req.user.id);
    if (!userWithRole) {
      return res.status(403).json({ message: 'Usuário não encontrado.' });
    }
    
    // For backward compatibility with existing system, check if user is admin by email
    const isAdmin = userWithRole.email === 'admin@cabedelo.pb.gov.br';
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Auth routes
  app.get('/api/auth/user', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || (user.email === 'admin@cabedelo.pb.gov.br' ? 'admin' : 'user')
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro ao carregar usuário" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || (user.email === 'admin@cabedelo.pb.gov.br' ? 'admin' : 'user')
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    // Para JWT, o logout é feito no frontend removendo o token
    res.json({ message: "Logout realizado com sucesso" });
  });

  // Chat routes
  app.post('/api/chat/query', authenticateToken, async (req: any, res) => {
    try {
      const validatedData = chatQuerySchema.parse(req.body);
      const { question, conversationId, queryType } = validatedData;
      const userId = req.user.id;

      let currentConversationId = conversationId;

      // If no conversation ID, create new conversation
      if (!currentConversationId) {
        const title = await generateConversationTitle(question);
        const newConversation = await storage.createConversation({
          user_id: userId,
          title,
          query_type: queryType
        });
        currentConversationId = newConversation.id;
      }

      // Save user message
      await storage.createMessage({
        conversation_id: currentConversationId,
        role: 'user',
        content: question
      });

      // Generate AI response based on query type
      let aiResponse: string;
      if (queryType === 'laws') {
        aiResponse = await generateLawsResponse(question);
      } else {
        aiResponse = await generateLegislativeResponse(question);
      }

      // Save AI response
      await storage.createMessage({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: aiResponse
      });

      res.json({
        answer: aiResponse,
        conversation_id: currentConversationId,
        query_type: queryType
      });
    } catch (error) {
      console.error("Chat query error:", error);
      res.status(500).json({ message: "Erro ao processar consulta" });
    }
  });

  app.get('/api/chat/history', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversations = await storage.getUserConversations(userId);
      
      // Return conversations directly as they already have the date field formatted
      res.json(conversations);
    } catch (error) {
      console.error("History fetch error:", error);
      res.status(500).json({ message: "Erro ao carregar histórico" });
    }
  });

  app.get('/api/chat/history/:id', authenticateToken, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const conversation = await storage.getConversationWithMessages(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }

      const formattedMessages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at || new Date().toISOString()
      }));

      res.json({
        id: conversation.id,
        title: conversation.title,
        messages: formattedMessages
      });
    } catch (error) {
      console.error("Conversation fetch error:", error);
      res.status(500).json({ message: "Erro ao carregar conversa" });
    }
  });

  // Admin routes - only accessible by administrators
  app.get('/api/admin/roles', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error("Roles fetch error:", error);
      res.status(500).json({ message: "Erro ao carregar funções" });
    }
  });

  app.post('/api/admin/users', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const validatedData = createUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário com este email já existe" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const newUser = await storage.createUser({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role_id: validatedData.role_id
      });

      // Remove password from response
      const { password, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ message: "Erro ao criar usuário" });
    }
  });

  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersResponse = users.map(({ password, ...user }) => user);
      res.json(usersResponse);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ message: "Erro ao carregar usuários" });
    }
  });

  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, role_id } = req.body;
      
      // Validate required fields
      if (!name || !email || !role_id) {
        return res.status(400).json({ message: "Nome, email e função são obrigatórios" });
      }
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Check if email is already in use by another user
      const emailUser = await storage.getUserByEmail(email);
      if (emailUser && emailUser.id !== userId) {
        return res.status(400).json({ message: "Este email já está em uso" });
      }
      
      const updatedUser = await storage.updateUser(userId, { name, email, role_id });
      res.json(updatedUser);
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent deleting the main admin user
      if (userId === 1) {
        return res.status(400).json({ message: "Não é possível excluir o administrador principal" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      await storage.deleteUser(userId);
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats fetch error:", error);
      res.status(500).json({ message: "Erro ao carregar estatísticas" });
    }
  });

  app.get('/api/admin/user-stats', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const userStats = await storage.getUserStats();
      res.json(userStats);
    } catch (error) {
      console.error("User stats fetch error:", error);
      res.status(500).json({ message: "Erro ao carregar estatísticas de usuários" });
    }
  });

  // Environment settings endpoints
  app.get('/api/admin/env-settings', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      // Return current environment variables (masked for security)
      const envSettings = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : '',
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_KEY: process.env.SUPABASE_KEY ? '***' + process.env.SUPABASE_KEY.slice(-4) : '',
        JWT_SECRET: process.env.JWT_SECRET ? '***' + process.env.JWT_SECRET.slice(-4) : '',
        INTERNAL_LAWS_API_URL: process.env.INTERNAL_LAWS_API_URL || '',
        INTERNAL_LAWS_API_KEY: process.env.INTERNAL_LAWS_API_KEY ? '***' + process.env.INTERNAL_LAWS_API_KEY.slice(-4) : ''
      };
      res.json(envSettings);
    } catch (error) {
      console.error("Error fetching environment settings:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  app.put('/api/admin/env-settings', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const envUpdates = req.body;
      
      // Update environment variables in runtime
      Object.keys(envUpdates).forEach(key => {
        if (envUpdates[key] && envUpdates[key] !== '' && !envUpdates[key].startsWith('***')) {
          process.env[key] = envUpdates[key];
        }
      });

      // Write to .env file for persistence
      const fs = await import('fs');
      const path = await import('path');
      
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      // Read existing .env file if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Update or add each environment variable
      Object.keys(envUpdates).forEach(key => {
        const value = envUpdates[key];
        if (value && value !== '' && !value.startsWith('***')) {
          const regex = new RegExp(`^${key}=.*$`, 'gm');
          const newLine = `${key}=${value}`;
          
          if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
          } else {
            envContent += envContent.endsWith('\n') ? newLine + '\n' : '\n' + newLine + '\n';
          }
        }
      });
      
      // Write updated content back to .env file
      fs.writeFileSync(envPath, envContent);
      
      res.json({ message: "Configurações atualizadas com sucesso. Use o botão 'Reiniciar Servidor' para aplicar as mudanças." });
    } catch (error) {
      console.error("Error updating environment settings:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
  });

  // Server restart endpoint
  app.post('/api/admin/restart-server', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      console.log("Admin triggered server restart");
      res.json({ message: "Servidor será reiniciado em breve..." });
      
      // Restart the server process after a short delay
      setTimeout(() => {
        console.log("Restarting server...");
        process.exit(0); // This will trigger the development server to restart
      }, 1000);
    } catch (error) {
      console.error("Error restarting server:", error);
      res.status(500).json({ message: "Erro ao reiniciar servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
