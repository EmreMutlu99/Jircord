# Stage 1: install dependencies & build
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src ./src

RUN npm run build
RUN npm install          

# Stage 2: runtime
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["npm", "run", "start"]  # uses ts-node-dev
