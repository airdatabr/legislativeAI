import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { loginSchema, chatQuerySchema } from "@shared/schema";
import { generateLegislativeResponse, generateConversationTitle, generateLawsResponse } from "./openai";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// JWT middleware
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido" });
    }
    req.user = user;
    next();
  });
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
      const { message, conversationId, queryType } = validatedData;
      const userId = req.user.id;

      let currentConversationId = conversationId;

      // If no conversation ID, create new conversation
      if (!currentConversationId) {
        const title = await generateConversationTitle(message);
        const newConversation = await storage.createConversation({
          userId,
          title
        });
        currentConversationId = newConversation.id;
      }

      // Save user message
      await storage.createMessage({
        conversationId: currentConversationId,
        role: 'user',
        content: message
      });

      // Generate AI response based on query type
      let aiResponse: string;
      if (queryType === 'laws') {
        aiResponse = await generateLawsResponse(message);
      } else {
        aiResponse = await generateLegislativeResponse(message);
      }

      // Save AI response
      await storage.createMessage({
        conversationId: currentConversationId,
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

  const httpServer = createServer(app);
  return httpServer;
}
