# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make

# Clone the repository (or copy if we mount it, but for setup script we usually clone)
# But here we assume the context is the cloned repo
COPY . .

# Build
RUN make deps && make build

# Runtime Stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies if any (PicoClaw claims to be static binary mostly, but ca-certificates are good)
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/bin/picoclaw /usr/local/bin/picoclaw

# Create workspace directory
RUN mkdir -p /root/.picoclaw/workspace

# Set environment variables
ENV PICOCLAW_HOME=/root/.picoclaw

# Entrypoint
CMD ["picoclaw", "gateway"]
