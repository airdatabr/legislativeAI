# Assistente Legislativo com IA - Replit Configuration

## Overview

This is a legislative assistant web application built with a modern full-stack architecture. The application provides AI-powered legislative consultation capabilities for municipal government employees, helping them quickly find and understand legislative documents, laws, and regulations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **AI Integration**: OpenAI GPT-4o for legislative query processing

### Key Components

#### Database Schema
The application uses a relational database with three main entities:
- **Users**: Stores user authentication and profile information
- **Conversations**: Tracks chat sessions between users and the AI assistant
- **Messages**: Stores individual messages within conversations (both user and assistant messages)

#### API Structure
- **Authentication Routes**: `/api/auth/login` for user authentication
- **Chat Routes**: `/api/chat/query` for AI queries, `/api/chat/history` for conversation history
- **Protected Routes**: All chat functionality requires JWT authentication

#### AI Integration
- Uses OpenAI GPT-4o model specifically configured for Brazilian municipal legislation
- Generates contextual responses with legal references and citations
- Automatically creates conversation titles based on user queries

## Data Flow

1. **User Authentication**: Users log in through the frontend, which sends credentials to the backend
2. **JWT Token**: Backend validates credentials and returns a JWT token stored in localStorage
3. **Chat Interface**: Authenticated users can start conversations with the AI assistant
4. **AI Processing**: User queries are sent to OpenAI API with specialized prompts for legislative context
5. **Response Storage**: All conversations and messages are stored in the database for history tracking

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: TypeScript ORM for database operations
- **openai**: Official OpenAI API client
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **react-hook-form**: Form handling and validation
- **zod**: Schema validation
- **jsonwebtoken**: JWT token handling
- **bcrypt**: Password hashing

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-***: Replit-specific development tools

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev` runs the development server with hot reload
- **Port**: Application runs on port 5000
- **Database**: Uses Neon serverless PostgreSQL via DATABASE_URL environment variable

### Production Build
- **Frontend Build**: `vite build` creates optimized static assets
- **Backend Build**: `esbuild` bundles the Node.js server
- **Start Command**: `npm run start` runs the production server
- **Deployment**: Configured for autoscale deployment on Replit

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for AI functionality
- `JWT_SECRET`: Secret key for JWT token signing

## Test User Account

For testing and demonstration purposes, a test user account has been created:
- **Email**: admin@cabedelo.pb.gov.br
- **Password**: password

This account can be used to access the legislative assistant and test the chat functionality.

## Changelog

- June 15, 2025. Initial setup with complete legislative assistant application
- June 15, 2025. Added Câmara Municipal de Cabedelo branding and logo integration
- June 15, 2025. Created test user account for authentication testing
- June 15, 2025. Implemented complete chat interface with AI integration
- June 15, 2025. Fixed sidebar layout and logo positioning issues
- June 15, 2025. Confirmed AI chat functionality is working properly - queries and responses displaying correctly
- June 15, 2025. Fixed logout functionality - added backend endpoint and proper frontend redirection to home page

## User Preferences

Preferred communication style: Simple, everyday language.