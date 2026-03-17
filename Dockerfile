# Stage 1: Build WASM
FROM rust:1.85-slim AS rust-builder
RUN apt-get update && apt-get install -y binaryen curl
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /app
COPY vex-verify ./vex-verify
WORKDIR /app/vex-verify
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

RUN npx next build --webpack

# Stage 3: Run
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build and assets
COPY --from=node-builder /app/public ./public
COPY --from=node-builder /app/.next/standalone ./
COPY --from=node-builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["server.js"]
