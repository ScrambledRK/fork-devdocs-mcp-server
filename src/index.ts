#!/usr/bin/env node

import { createMcpServer } from './server.js';

const TRANSPORT_MODE = process.env.TRANSPORT_MODE || 'http';

async function main() {
  const serverInstance = createMcpServer();

  if (TRANSPORT_MODE === 'stdio') {
    // Use stdio transport for Claude Desktop compatibility
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await serverInstance.server.connect(transport);
    console.error('DevDocs MCP Server running on stdio (TRANSPORT_MODE=stdio)');
  } else {
    // Default: use HTTP transport
    const { startHttpServer } = await import('./httpServer.js');
    
    process.env.PORT = process.env.PORT || '3000';
    
    startHttpServer();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
