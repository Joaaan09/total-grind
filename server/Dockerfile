# Imagen base Node.js
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Exponer puerto (no publish, para reverse proxy)
EXPOSE 5000

# Comando de inicio
CMD ["node", "index.js"]
