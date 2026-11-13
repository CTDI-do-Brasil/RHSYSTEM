FROM node:20-alpine

WORKDIR /usr/src/app

# Copia arquivos de dependência
COPY package*.json ./

# Instala dependências de produção
RUN npm ci --only=production || npm install --production

# Copia todo o código da aplicação
COPY . .

# Define porta e ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta configurada
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
