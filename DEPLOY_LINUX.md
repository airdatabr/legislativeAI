# Deploy da Aplicação em Sistema Linux

## Pré-requisitos

### 1. Sistema Linux (Ubuntu/Debian/CentOS)
```bash
# Atualizar o sistema
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# OU
sudo yum update -y  # CentOS/RHEL
```

### 2. Instalar Node.js 20
```bash
# Instalar Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # deve mostrar v20.x.x
npm --version
```

### 3. Instalar PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 4. Instalar Git
```bash
sudo apt install git -y  # Ubuntu/Debian
# OU
sudo yum install git -y  # CentOS/RHEL
```

## Configuração do Projeto

### 1. Clonar ou Transferir o Projeto
```bash
# Opção 1: Clonar do repositório
git clone <seu-repositorio>
cd <nome-do-projeto>

# Opção 2: Transferir arquivos via SCP/SFTP
# scp -r ./projeto usuario@servidor:/home/usuario/assistente-legislativo
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
```bash
# Criar arquivo .env
nano .env

# Adicionar as seguintes variáveis:
SESSION_SECRET="sua-session-secret-aqui"
JWT_SECRET="seu-jwt-secret-aqui"
OPENAI_API_KEY="sk-proj-sua-chave-openai-aqui"
SUPABASE_URL="https://supabase.airdata.com.br"
SUPABASE_KEY="sua-chave-supabase-aqui"
INTERNAL_LAWS_API_URL="https://api.openai.com/v1/chat/completions"
INTERNAL_LAWS_API_KEY="sk-proj-sua-chave-openai-aqui"
NODE_ENV="production"
PORT="5000"
```

### 4. Construir a Aplicação
```bash
npm run build
```

## Configuração do Servidor Web

### 1. Instalar Nginx (Recomendado)
```bash
sudo apt install nginx -y  # Ubuntu/Debian
# OU
sudo yum install nginx -y  # CentOS/RHEL

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Configurar Nginx como Proxy Reverso
```bash
# Criar configuração do site
sudo nano /etc/nginx/sites-available/assistente-legislativo

# Adicionar a seguinte configuração:
server {
    listen 80;
    server_name seu-dominio.com;  # Substitua pelo seu domínio

    location / {
        proxy_pass http://localhost:5000;
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
```

### 3. Ativar a Configuração
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/assistente-legislativo /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

## Configuração do Firewall

### 1. Configurar UFW (Ubuntu/Debian)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Configurar Firewalld (CentOS/RHEL)
```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Deploy e Execução

### 1. Iniciar Aplicação com PM2
```bash
# Navegar para o diretório do projeto
cd /caminho/para/seu/projeto

# Iniciar aplicação
pm2 start npm --name "assistente-legislativo" -- run start

# Verificar status
pm2 status

# Ver logs
pm2 logs assistente-legislativo
```

### 2. Configurar PM2 para Inicialização Automática
```bash
# Salvar configuração atual
pm2 save

# Gerar script de inicialização
pm2 startup

# Executar o comando exibido (será algo como):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u usuario --hp /home/usuario
```

## Configuração HTTPS (SSL)

### 1. Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu/Debian
# OU
sudo yum install certbot python3-certbot-nginx -y  # CentOS/RHEL
```

### 2. Obter Certificado SSL
```bash
sudo certbot --nginx -d seu-dominio.com
```

### 3. Configurar Renovação Automática
```bash
# Testar renovação
sudo certbot renew --dry-run

# A renovação automática já está configurada via cron
```

## Monitoramento e Manutenção

### 1. Comandos Úteis do PM2
```bash
# Ver status de todos os processos
pm2 status

# Reiniciar aplicação
pm2 restart assistente-legislativo

# Parar aplicação
pm2 stop assistente-legislativo

# Ver logs em tempo real
pm2 logs assistente-legislativo --lines 50

# Recarregar aplicação (zero-downtime)
pm2 reload assistente-legislativo
```

### 2. Monitoramento de Sistema
```bash
# Verificar uso de recursos
top
htop  # se instalado

# Verificar espaço em disco
df -h

# Verificar memória
free -h

# Verificar logs do sistema
sudo journalctl -f
```

### 3. Backup Regular
```bash
# Criar script de backup
nano backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/assistente-legislativo"
PROJECT_DIR="/caminho/para/seu/projeto"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $PROJECT_DIR

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

# Tornar executável
chmod +x backup.sh

# Adicionar ao crontab para execução diária
crontab -e
# Adicionar linha: 0 2 * * * /caminho/para/backup.sh
```

## Atualizações

### 1. Processo de Atualização
```bash
# Parar aplicação
pm2 stop assistente-legislativo

# Fazer backup
./backup.sh

# Atualizar código (se usando Git)
git pull origin main

# Instalar dependências atualizadas
npm install

# Reconstruir aplicação
npm run build

# Reiniciar aplicação
pm2 start assistente-legislativo
```

## Solução de Problemas

### 1. Verificar Logs
```bash
# Logs da aplicação
pm2 logs assistente-legislativo

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs do sistema
sudo journalctl -u nginx
```

### 2. Problemas Comuns

**Porta 5000 ocupada:**
```bash
# Verificar processos na porta
sudo lsof -i :5000
# Matar processo se necessário
sudo kill -9 <PID>
```

**Problemas de permissão:**
```bash
# Verificar proprietário dos arquivos
ls -la
# Corrigir permissões se necessário
sudo chown -R usuario:usuario /caminho/para/projeto
```

**Aplicação não inicia:**
```bash
# Verificar variáveis de ambiente
pm2 env assistente-legislativo

# Testar aplicação manualmente
cd /caminho/para/projeto
npm run start
```

## Configuração de Domínio

### 1. DNS
- Configure o DNS do seu domínio para apontar para o IP do servidor
- Adicione um registro A: `seu-dominio.com` -> `IP_DO_SERVIDOR`

### 2. Subdomínio (opcional)
- Para usar um subdomínio como `app.seu-dominio.com`
- Adicione um registro A: `app.seu-dominio.com` -> `IP_DO_SERVIDOR`
- Atualize a configuração do Nginx com o novo server_name

## Conclusão

Após seguir todos esses passos, sua aplicação estará:
- Executando em produção no Linux
- Protegida por HTTPS
- Monitorada pelo PM2
- Acessível via domínio próprio
- Configurada para backup automático
- Pronta para atualizações

Para suporte técnico adicional, consulte os logs e a documentação específica de cada componente.