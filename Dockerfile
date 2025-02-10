# Build stage
FROM mcr.microsoft.com/devcontainers/javascript-node:0-20 AS builder
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN npm install -g yarn
RUN yarn install
COPY . .
RUN yarn build

# Create nginx config dynamically
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
    location / { \
    try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ { \
    expires 7d; \
    add_header Cache-Control "public, no-transform"; \
    } \
    }' > nginx.conf

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]