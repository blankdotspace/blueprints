# Build Stage
FROM golang:alpine AS builder

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

# Create non-root user (id 1000)
RUN addgroup -S -g 1000 agent && adduser -S -u 1000 -G agent agent

WORKDIR /agent-home

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/build/picoclaw /usr/local/bin/picoclaw

# Create directories and set permissions
RUN mkdir -p /agent-home/.picoclaw/workspace && \
    chown -R agent:agent /agent-home

# Switch to non-root user
USER agent

# Set environment variables
ENV HOME=/agent-home
ENV PICOCLAW_HOME=/agent-home/.picoclaw

# Entrypoint
CMD ["picoclaw", "gateway"]
