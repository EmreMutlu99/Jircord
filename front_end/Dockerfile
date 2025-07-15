# front_end/Dockerfile
FROM node:18-slim
WORKDIR /app

# 1) Copy package manifests & install deps
COPY package*.json ./
RUN npm install

# 2) Copy the rest of your front-end source
COPY . .

# 3) Expose Vite dev port & run
EXPOSE 5173
CMD ["npm", "run", "dev"]
