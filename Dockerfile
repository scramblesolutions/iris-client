FROM mcr.microsoft.com/devcontainers/javascript-node:0-20
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN npm install -g yarn
RUN yarn install 
COPY . .
EXPOSE 5173
CMD ["yarn", "dev", "--host"]
