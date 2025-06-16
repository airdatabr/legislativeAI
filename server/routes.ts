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
function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
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
        email: user.email
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
          email: user.email
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
          title
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
      
      const formattedConversations = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        date: conv.updatedAt
      }));

      res.json(formattedConversations);
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
        timestamp: msg.createdAt
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
        role: validatedData.role
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

  const httpServer = createServer(app);
  return httpServer;
}
