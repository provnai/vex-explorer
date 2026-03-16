# Stage 1: Build WASM
FROM rust:1.85-slim AS rust-builder
RUN apt-get update && apt-get install -y binaryen curl
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /app
COPY wasm-vex ./wasm-vex
WORKDIR /app/wasm-vex
RUN wasm-pack build --target web --out-dir ../src/lib/wasm --out-name wasm_vex

# Stage 2: Build Next.js
FROM node:20-slim AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy built WASM from stage 1
COPY --from=rust-builder /app/src/lib/wasm ./src/lib/wasm
# Copy rest of the app
COPY . .

RUN npm run build

# Stage 3: Run
FROM node:20-slim
WORKDIR /app
COPY --from=node-builder /app/.next ./.next
COPY --from=node-builder /app/public ./public
COPY --from=node-builder /app/package*.json ./
COPY --from=node-builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
