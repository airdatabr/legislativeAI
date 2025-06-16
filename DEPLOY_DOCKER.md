# Deploy com Docker e Portainer

## Configuração usando Portainer (Método Recomendado)

### 1. Criar Dockerfile

Primeiro, vamos criar o Dockerfile no projeto:

```dockerfile
FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache git

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Construir aplicação
RUN npm run build

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Alterar proprietário dos arquivos
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expor porta
EXPOSE 5000

# Comando de inicialização
CMD ["npm", "run", "start"]
```

### 2. Criar .dockerignore

```dockerignore
node_modules
.git
.gitignore
README.md
.env
.cache
dist
.replit
.config
```

### 3. Deploy via Portainer Interface

#### 3.1 Acessar Portainer
- Acesse seu Portainer no navegador
- Faça login com suas credenciais

#### 3.2 Criar Stack
1. Vá em **Stacks** no menu lateral
2. Clique em **+ Add stack**
3. Nome da stack: `assistente-legislativo`

#### 3.3 Docker Compose (Método Recomendado)

Cole este docker-compose.yml no editor:

```yaml
version: '3.8'

services:
  assistente-legislativo:
    build: .
    container_name: assistente-legislativo
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - INTERNAL_LAWS_API_URL=${INTERNAL_LAWS_API_URL}
      - INTERNAL_LAWS_API_KEY=${INTERNAL_LAWS_API_KEY}
    volumes:
      - app_data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    container_name: assistente-legislativo-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot_www:/var/www/certbot/:ro
      - certbot_conf:/etc/nginx/ssl/:ro
    depends_on:
      - assistente-legislativo
    networks:
      - app_network

  certbot:
    image: certbot/certbot:latest
    container_name: assistente-legislativo-certbot
    volumes:
      - certbot_www:/var/www/certbot/:rw
      - certbot_conf:/etc/letsencrypt/:rw

volumes:
  app_data:
  certbot_www:
  certbot_conf:

networks:
  app_network:
    driver: bridge
```

#### 3.4 Configurar Variáveis de Ambiente

Na seção **Environment variables** do Portainer, adicione:

```
SESSION_SECRET=sua-session-secret-aqui
JWT_SECRET=seu-jwt-secret-aqui
OPENAI_API_KEY=sk-proj-sua-chave-openai-aqui
SUPABASE_URL=https://supabase.airdata.com.br
SUPABASE_KEY=sua-chave-supabase-aqui
INTERNAL_LAWS_API_URL=https://api.openai.com/v1/chat/completions
INTERNAL_LAWS_API_KEY=sk-proj-sua-chave-openai-aqui
```

### 4. Configuração do Nginx

Crie o arquivo `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    upstream app {
        server assistente-legislativo:5000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name seu-dominio.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name seu-dominio.com;

        ssl_certificate /etc/nginx/ssl/live/seu-dominio.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/seu-dominio.com/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 5. Deploy da Stack

1. **Upload dos arquivos**:
   - Use o **File Manager** do Portainer ou SCP para enviar:
     - Dockerfile
     - nginx.conf
     - Código fonte da aplicação

2. **Executar Stack**:
   - Clique em **Deploy the stack**
   - Aguarde o build e deploy automático

### 6. Configuração SSL (Opcional)

#### 6.1 Obter Certificado SSL

Execute no terminal do servidor ou via Portainer Console:

```bash
# Parar nginx temporariamente
docker-compose stop nginx

# Obter certificado
docker-compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d seu-dominio.com

# Reiniciar nginx
docker-compose start nginx
```

#### 6.2 Renovação Automática

Adicione ao crontab do servidor:

```bash
0 12 * * * /usr/local/bin/docker-compose -f /path/to/docker-compose.yml run --rm certbot renew --quiet && /usr/local/bin/docker-compose -f /path/to/docker-compose.yml exec nginx nginx -s reload
```

### 7. Monitoramento via Portainer

#### 7.1 Verificar Status
- Acesse **Containers** para ver status dos serviços
- Verifique **Logs** para debug
- Use **Stats** para monitorar recursos

#### 7.2 Health Checks
- O container inclui health check automático
- Status visível na interface do Portainer

### 8. Comandos Úteis via Portainer

#### 8.1 Console dos Containers
- Clique no container
- Vá em **Console**
- Execute comandos diretamente

#### 8.2 Atualizações
1. **Rebuild Image**:
   - Vá em **Stacks**
   - Clique em **Editor**
   - Modifique se necessário
   - Clique em **Update the stack**

2. **Logs em Tempo Real**:
   - Selecione o container
   - Clique em **Logs**
   - Ative **Auto-refresh**

### 9. Backup via Portainer

#### 9.1 Backup de Volumes
```bash
# Via console do Portainer
docker run --rm -v assistente-legislativo_app_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .
```

#### 9.2 Export de Stack
- Na interface de Stacks
- Clique nos três pontos
- Selecione **Export**

### 10. Vantagens do Portainer

✅ **Interface gráfica intuitiva**
✅ **Logs centralizados**
✅ **Monitoramento visual de recursos**
✅ **Deploy com um clique**
✅ **Backup simplificado**
✅ **Health checks automáticos**
✅ **SSL automatizado**
✅ **Rollback fácil**

### 11. Solução de Problemas

#### 11.1 Container não inicia
- Verifique logs no Portainer
- Confirme variáveis de ambiente
- Teste build local

#### 11.2 Problemas de rede
- Verifique se a network está criada
- Confirme portas expostas
- Teste conectividade entre containers

#### 11.3 SSL não funciona
- Verifique DNS apontando para servidor
- Confirme portas 80/443 abertas
- Verifique logs do certbot

### 12. Deploy Simplificado (Método Rápido)

Se preferir o método mais simples, use apenas o container da aplicação:

1. **Container único** via Portainer:
   - Containers → Add container
   - Name: `assistente-legislativo`
   - Image: `node:20-alpine`
   - Command: `sh -c "npm ci && npm run build && npm start"`
   - Ports: `5000:5000`
   - Volumes: monte o código fonte
   - Environment: adicione todas as variáveis

2. **Nginx separado** (se já tiver):
   - Configure proxy_pass para `http://IP_SERVIDOR:5000`

Este método com Portainer é muito mais simples que o deploy manual e oferece excelente interface de gerenciamento!