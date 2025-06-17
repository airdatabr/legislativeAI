import dotenv from "dotenv";
import path from "path";
dotenv.config();

// Remove deprecated PostgreSQL environment variables for clean deployment
const deprecatedVars = ['DATABASE_URL', 'PGDATABASE', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD'];
deprecatedVars.forEach(varName => {
  if (process.env[varName]) {
    delete process.env[varName];
    console.log(`Removed deprecated variable: ${varName}`);
  }
});

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

// Verificar se estamos em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';

// Importar módulo vite apenas em desenvolvimento
let viteModule: any = null;
if (isDevelopment) {
  viteModule = await import('./vite');
}

// Usar funções do vite ou alternativas para produção
const log = viteModule?.log || console.log;
const serveStatic = viteModule?.serveStatic || ((app: any) => {
  // Em produção, servir arquivos estáticos do diretório dist/public
  const publicPath = path.join(process.cwd(), 'dist/public');
  app.use(express.static(publicPath));
  
  // Catch-all para SPA
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile('index.html', { root: publicPath });
    }
  });
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isDevelopment && viteModule) {
    await viteModule.setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
