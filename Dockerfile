# pin the nodejs version to the LTS as at 5th February, 2024
FROM node:22.13.1 AS builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

ENV NODE_ENV="production"

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

# ------------------------- Stage 2 ------------------------------
# Using an alpine image because it's smaller in size
FROM node:22.13.1-alpine3.20 

WORKDIR /app

# Use a non-root user for security
RUN addgroup -S turftribe && adduser -S turftribe -G turftribe
USER turftribe

# Copy only necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV="production"

# Start the server using the production build
ENTRYPOINT [ "node", "dist/main.js" ]