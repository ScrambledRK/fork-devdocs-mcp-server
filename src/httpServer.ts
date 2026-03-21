#!/usr/bin/env node

import * as http from 'http';
import { createMcpServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DEBUG = process.env.DEBUG === 'true' || process.env.DEBUG === '1';

function logDebug(message: string, data?: unknown) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    if (data !== undefined) {
      console.log(`[DEBUG ${timestamp}] ${message}:`, JSON.stringify(data));
    } else {
      console.log(`[DEBUG ${timestamp}] ${message}`);
    }
  }
}

async function startHttpServer() {
  logDebug('Starting HTTP server', { port: PORT });
  
  const app = http.createServer((req, res) => {
    logDebug('Incoming request', {
      method: req.method,
      url: req.url,
      headers: req.headers
    });

    // Set CORS headers early
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version');

    // Health endpoint
    if (req.url === '/health') {
      logDebug('Health check request');
      res.writeHead(200);
      const response = { status: 'healthy', timestamp: new Date().toISOString() };
      res.end(JSON.stringify(response));
      logDebug('Health check response sent', response);
      return;
    }

    // Handle MCP endpoint paths
    const url = req.url?.split('?')[0];
    
    if (url !== '/mcp') {
      logDebug('404 Not found', { requestedUrl: req.url, normalizedUrl: url });
      res.writeHead(404);
      const response = { error: 'Not found' };
      res.end(JSON.stringify(response));
      logDebug('404 response sent', response);
      return;
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      logDebug('CORS preflight request');
      res.writeHead(204);
      res.end();
      logDebug('Preflight response sent');
      return;
    }

    if (req.method === 'GET') {
      logDebug('SSE stream request');
      handleSseStream(req, res);
      return;
    }

    if (req.method === 'POST') {
      logDebug('POST request to /mcp');
      handlePostRequest(req, res);
      return;
    }

    logDebug('Method not allowed', { method: req.method });
    res.writeHead(405);
    res.end();
  });

  app.listen(PORT, () => {
    console.log(`DevDocs MCP Server running on http://0.0.0.0:${PORT}`);
    console.log(`MCP Endpoint: http://localhost:${PORT}/mcp`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    if (DEBUG) {
      console.log('Debug logging enabled');
    }
  });
}

function handleSseStream(req: http.IncomingMessage, res: http.ServerResponse) {
  logDebug('Setting up SSE stream');
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial event to prime the stream
  const eventId = Date.now().toString();
  logDebug('Sending SSE init event', { eventId });
  res.write(`id: ${eventId}\n`);
  res.write(`data: \n\n`);

  req.on('close', () => {
    logDebug('SSE stream closed by client');
    res.end();
  });
}

function handlePostRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  logDebug('Handling POST request');
  
  const chunks: Buffer[] = [];
  
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  req.on('end', async () => {
    const body = Buffer.concat(chunks).toString();
    logDebug('POST request body received', { body });
    
    try {
      const request = JSON.parse(body);
      logDebug('Processing MCP request', request);
      
      // Process the request
      const result = await processRequest(request);
      
      logDebug('MCP request processed, sending response', result);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      logDebug('Error processing request', error);
      
      if (!res.writableEnded) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        logDebug('Sending error response', { message: errorMessage });
        
        res.writeHead(400);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: `Internal error: ${errorMessage}`
          }
        }));
      }
    }
  });
  
  req.on('error', (err) => {
    logDebug('Request error', err);
    
    if (!res.writableEnded) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

async function processRequest(request: any): Promise<any> {
  // Initialize request
  if (request.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'devdocs-mcp-server',
          version: '1.0.0'
        }
      }
    };
  }

  // Handle notification (no ID)
  if (!request.id && request.method) {
    return null; // Notifications don't need responses
  }

  // List tools request
  if (request.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: [
          {
            name: "list_docs",
            description: "List all available documentation sets on DevDocs.io. Returns name, slug, version, and other metadata for each documentation.",
            inputSchema: {
              type: "object",
              properties: {
                filter: {
                  type: "string",
                  description: "Optional filter string to search for specific documentation by name",
                },
              },
            },
          },
          {
            name: "search_doc",
            description: "Search within a specific documentation set for entries matching the query. Returns matching entries with their paths and types.",
            inputSchema: {
              type: "object",
              properties: {
                doc_slug: {
                  type: "string",
                  description: "The slug of the documentation to search (e.g., 'javascript', 'python~3.12', 'react')",
                },
                query: {
                  type: "string",
                  description: "The search query to find matching entries",
                },
              },
              required: ["doc_slug", "query"],
            },
          },
          {
            name: "get_doc_content",
            description: "Fetch the full HTML content for a specific documentation entry. Use the path from search results.",
            inputSchema: {
              type: "object",
              properties: {
                doc_slug: {
                  type: "string",
                  description: "The slug of the documentation (e.g., 'javascript', 'python~3.12')",
                },
                path: {
                  type: "string",
                  description: "The path to the specific entry (from search results)",
                },
              },
              required: ["doc_slug", "path"],
            },
          },
          {
            name: "search_all_docs",
            description: "Search across multiple documentation sets. Optionally filter by specific documentation slugs.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find matching entries",
                },
                doc_slugs: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional array of documentation slugs to search within. If not provided, searches across top documentation sets.",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_doc_index",
            description: "Get the complete index of entries for a specific documentation set. Useful for browsing available topics.",
            inputSchema: {
              type: "object",
              properties: {
                doc_slug: {
                  type: "string",
                  description: "The slug of the documentation (e.g., 'javascript', 'python~3.12')",
                },
              },
              required: ["doc_slug"],
            },
          },
        ],
      },
    };
  }

  // Tool call request
  if (request.method === 'tools/call') {
    const serverInstance = createMcpServer();
    
    try {
      // Extract tool name and arguments from the request
      const { name, arguments: args } = request.params || {};
      
      // Call the appropriate handler based on tool name
      let result;
      
      switch (name) {
        case "list_docs": {
          result = await serverInstance.listDocs(args?.filter as string | undefined);
          break;
        }
        case "search_doc": {
          const doc_slug = args?.doc_slug as string;
          const query = args?.query as string;
          result = await serverInstance.searchInDoc(doc_slug, query);
          break;
        }
        case "get_doc_content": {
          const doc_slug = args?.doc_slug as string;
          const path = args?.path as string;
          result = await serverInstance.fetchDocContent(doc_slug, path);
          break;
        }
        case "search_all_docs": {
          const query = args?.query as string;
          const doc_slugs = args?.doc_slugs as string[] | undefined;
          result = await serverInstance.searchAllDocs(query, doc_slugs);
          break;
        }
        case "get_doc_index": {
          const doc_slug = args?.doc_slug as string;
          result = await serverInstance.fetchDocIndex(doc_slug);
          break;
        }
        default:
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`
            }
          };
      }
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) }
          ]
        }
      };
    } catch (error) {
      const errorMessage = String(error);
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Internal error: ${errorMessage}`
        }
      };
    }
  }

  // Default response for unknown methods
  if (!request.id) {
    return null; // No ID = notification, no response needed
  }

  return {
    jsonrpc: '2.0',
    id: request.id,
    error: {
      code: -32601,
      message: `Method not found: ${request.method}`
    }
  };
}

// Start the server
startHttpServer().catch((error) => {
  console.error('Fatal error starting HTTP server:', error);
  process.exit(1);
});

export { startHttpServer };
