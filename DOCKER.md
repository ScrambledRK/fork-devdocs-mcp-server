# DevDocs MCP Server - Docker Setup

## Quick Start

```bash
# Build and run with docker-compose
docker-compose up --build

# Or manually with docker
docker build -t devdocs-mcp-server:latest .
docker run -p 3000:3000 devdocs-mcp-server:latest
```

## Configuration

The server runs on port 3000 by default. You can customize the port via environment variable:

```bash
docker run -e PORT=8080 -p 8080:8080 devdocs-mcp-server:latest
```

## MCP Endpoint

The server provides an HTTP-based MCP endpoint at:
- `http://localhost:3000/mcp` (default)

### Protocol Options

MCP servers can be accessed via two HTTP methods:

**POST (Modern)** - Most common and recommended:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**GET (Legacy SSE)** - Server-Sent Events for streaming:
```bash
curl http://localhost:3000/mcp
# Receives server-sent events over time
```

The POST method is used for request/response interactions, while GET provides a streaming event stream. Most clients should use POST.

Configure your MCP client with this URL to connect to the DevDocs server.

## Troubleshooting

### Port already in use
```bash
docker run -p 8080:8080 -e PORT=8080 devdocs-mcp-server:latest
```

### Connection refused
```bash
docker ps
docker logs <container-id>
```
