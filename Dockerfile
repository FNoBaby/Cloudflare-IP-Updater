# ---------- BUILD STAGE ----------
FROM node:18 AS builder
WORKDIR /app

# Copy only package files first (better cache)
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy app source
COPY index.js .



# ---------- FINAL STAGE (DISTROLESS) ----------
FROM gcr.io/distroless/nodejs18

WORKDIR /app

# Copy only node_modules + index.js — nothing else
COPY --from=builder /app /app

# Distroless uses ENTRYPOINT, so CMD must be an array with script name
CMD ["index.js"]
