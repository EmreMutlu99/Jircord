# Stage 1: install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

# Stage 2: development runtime
FROM node:18-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]
