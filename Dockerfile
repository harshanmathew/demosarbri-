###################
# BASE IMAGE
###################

FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /usr/src/app
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Add Socket.IO specific environment variables
ENV NODE_ENV=production \
    SOCKET_IO_PATH="/socket.io" \
    SOCKET_IO_CORS_ORIGIN="*" \
    SOCKET_IO_PING_TIMEOUT=5000 \
    SOCKET_IO_PING_INTERVAL=10000 \
    SOCKET_IO_TRANSPORT="['websocket', 'polling']"

###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM base AS development
RUN  pnpm install --frozen-lockfile --ignore-scripts
COPY . .
# Expose both HTTP and Socket.IO ports
EXPOSE 3001
USER node

###################
# BUILD FOR PRODUCTION
###################

FROM base AS build
RUN pnpm fetch --prod
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm run build \
    && NODE_ENV=production pnpm install -r --offline --prod --ignore-scripts
USER node

####################
# PRODUCTION
###################

FROM base AS production
COPY --from=build /usr/src/app/ .
# Expose both HTTP and Socket.IO ports
EXPOSE 3001

ENTRYPOINT ["node", "dist/main.js"]
