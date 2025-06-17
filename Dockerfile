FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache git

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo tsx)
RUN npm ci

# Copiar código fonte
COPY . .

# Construir apenas o cliente
RUN npm run build

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Alterar proprietário dos arquivos
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expor porta
EXPOSE 5000

# Health check
#HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Comando de inicialização usando tsx
CMD ["npm", "run", "start"]
