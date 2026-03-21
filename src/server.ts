import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

const DEVDOCS_BASE_URL = "https://devdocs.io";
const DEVDOCS_DOCUMENTS_URL = "https://documents.devdocs.io";
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

interface DocMetadata {
  name: string;
  slug: string;
  type: string;
  version?: string;
  release?: string;
  mtime: number;
  db_size: number;
  links?: {
    home?: string;
    code?: string;
  };
  attribution?: string;
}

interface IndexEntry {
  name: string;
  path?: string;
  type?: string;
}

interface SearchResult {
  doc: string;
  name: string;
  path: string;
  type?: string;
  url: string;
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60;

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logDebug('Cache hit', { key });
    return cached.data as T;
  }
  logDebug('Cache miss', { key });
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  logDebug('Data cached', { key });
}

async function fetchDocsList(): Promise<DocMetadata[]> {
  logDebug('Fetching docs list');
  
  const cached = getCached<DocMetadata[]>("docs_list");
  if (cached) {
    logDebug('Returning cached docs list');
    return cached;
  }

  try {
    const response = await fetch(`${DEVDOCS_BASE_URL}/docs.json`);
    logDebug('Fetched docs.json', { status: response.status });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch docs list: ${response.statusText}`);
    }
    const docs = (await response.json()) as DocMetadata[];
    logDebug('Docs list fetched successfully', { count: docs.length });
    
    setCache("docs_list", docs);
    return docs;
  } catch (error) {
    logDebug('Error fetching docs list', error);
    throw error;
  }
}

async function fetchDocIndex(slug: string): Promise<IndexEntry[]> {
  const cacheKey = `index_${slug}`;
  logDebug(`Fetching doc index`, { slug, cacheKey });
  
  const cached = getCached<IndexEntry[]>(cacheKey);
  if (cached) {
    logDebug('Returning cached doc index', { slug, count: cached.length });
    return cached;
  }

  try {
    const response = await fetch(`${DEVDOCS_DOCUMENTS_URL}/${slug}/index.json`);
    logDebug(`Fetched index for ${slug}`, { status: response.status });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch index for ${slug}: ${response.statusText}`);
    }

    const rawIndex = (await response.json()) as any;
    const entries: IndexEntry[] = rawIndex.entries || [];
    logDebug('Doc index parsed', { slug, entryCount: entries.length });

    setCache(cacheKey, entries);
    return entries;
  } catch (error) {
    logDebug(`Error fetching doc index for ${slug}`, error);
    throw error;
  }
}

async function fetchDocContent(slug: string, path: string): Promise<string> {
  const cacheKey = `content_${slug}_${path}`;
  logDebug('Fetching doc content', { slug, path, cacheKey });
  
  const cached = getCached<string>(cacheKey);
  if (cached) {
    logDebug('Returning cached doc content', { slug, path });
    return cached;
  }

  try {
    const response = await fetch(`${DEVDOCS_DOCUMENTS_URL}/${slug}/${path}.html`);
    logDebug(`Fetched content for ${slug}/${path}`, { status: response.status });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.statusText}`);
    }

    const content = await response.text();
    logDebug('Doc content fetched', { slug, path, length: content.length });

    setCache(cacheKey, content);
    return content;
  } catch (error) {
    logDebug(`Error fetching doc content for ${slug}/${path}`, error);
    throw error;
  }
}

async function searchInDoc(slug: string, query: string): Promise<SearchResult[]> {
  logDebug('Searching in doc', { slug, query });
  
  const index = await fetchDocIndex(slug);
  const lowerQuery = query.toLowerCase();

  const matches = index.filter(entry => entry.name.toLowerCase().includes(lowerQuery));
  logDebug(`Found ${matches.length} matches for "${query}" in ${slug}`);

  const results: SearchResult[] = matches.map((entry, idx) => ({
    doc: slug,
    name: entry.name,
    path: entry.path || entry.name.toLowerCase().replace(/\s+/g, '-'),
    type: entry.type,
    url: `${DEVDOCS_BASE_URL}/${slug}/${entry.path || entry.name.toLowerCase().replace(/\s+/g, '-')}`,
  }));

  const finalResults = results.slice(0, 20);
  logDebug('searchInDoc completed', { slug, query, resultCount: finalResults.length });
  
  return finalResults;
}

async function searchAllDocs(query: string, docFilter?: string[]): Promise<SearchResult[]> {
  logDebug('Searching all docs', { query, filter: docFilter });
  
  const docs = await fetchDocsList();
  const docsToSearch = docFilter && docFilter.length > 0
    ? docs.filter(doc => docFilter.includes(doc.slug))
    : docs.slice(0, 20);

  logDebug(`Searching ${docsToSearch.length} documentation sets`, { query });

  const results: SearchResult[] = [];

  for (const doc of docsToSearch) {
    try {
      logDebug(`Searching in ${doc.slug}`, { slug: doc.slug, query });
      
      const docResults = await searchInDoc(doc.slug, query);
      results.push(...docResults);
      logDebug(`${doc.slug} results`, { count: docResults.length });

      if (results.length >= 50) {
        logDebug('Reached max result limit (50)');
        break;
      }
    } catch (error) {
      logDebug(`Failed to search in ${doc.slug}`, error);
    }
  }

  const finalResults = results.slice(0, 50);
  logDebug('searchAllDocs completed', { query, resultCount: finalResults.length });
  
  return finalResults;
}

interface DevDocsServer {
  server: Server;
  listDocs: (filter?: string) => Promise<DocMetadata[]>;
  searchInDoc: (slug: string, query: string) => Promise<SearchResult[]>;
  fetchDocContent: (slug: string, path: string) => Promise<string>;
  searchAllDocs: (query: string, docSlugs?: string[]) => Promise<SearchResult[]>;
  fetchDocIndex: (slug: string) => Promise<IndexEntry[]>;
}

function createMcpServer(): DevDocsServer {
  const tools: Tool[] = [
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
  ];

  const server = new Server(
    {
      name: "devdocs-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logDebug('List tools request received');
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logDebug('Call tool request', { name, args });

    try {
      switch (name) {
        case "list_docs": {
          logDebug('Processing list_docs');
          
          const docs = await fetchDocsList();
          let filteredDocs = docs;

          if (args?.filter && typeof args.filter === "string") {
            const filter = args.filter.toLowerCase();
            logDebug(`Filtering docs with: "${filter}"`);
            filteredDocs = docs.filter(
              doc => doc.name.toLowerCase().includes(filter) ||
                     doc.slug.toLowerCase().includes(filter)
            );
            logDebug('Filtered result', { originalCount: docs.length, filteredCount: filteredDocs.length });
          }

          const response = {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  filteredDocs.map(doc => ({
                    name: doc.name,
                    slug: doc.slug,
                    version: doc.version,
                    release: doc.release,
                    type: doc.type,
                    links: doc.links,
                    mtime: new Date(doc.mtime * 1000).toISOString(),
                    size_kb: Math.round(doc.db_size / 1024),
                  })),
                  null,
                  2
                ),
              },
            ],
          };

          logDebug('list_docs response prepared', { docCount: filteredDocs.length });
          return response;
        }

        case "search_doc": {
          const docSlug = args?.doc_slug as string;
          const query = args?.query as string;

          if (!docSlug || !query) {
            logDebug('Validation error', { docSlug, query });
            throw new Error("doc_slug and query are required");
          }

          logDebug(`Executing search_doc`, { docSlug, query });
          
          const results = await searchInDoc(docSlug, query);

          logDebug('search_doc response prepared', { count: results.length });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        case "get_doc_content": {
          const docSlug = args?.doc_slug as string;
          const path = args?.path as string;

          if (!docSlug || !path) {
            logDebug('Validation error', { docSlug, path });
            throw new Error("doc_slug and path are required");
          }

          logDebug(`Executing get_doc_content`, { docSlug, path });
          
          const content = await fetchDocContent(docSlug, path);

          logDebug('get_doc_content response prepared', { length: content.length });
          return {
            content: [
              {
                type: "text",
                text: content,
              },
            ],
          };
        }

        case "search_all_docs": {
          const query = args?.query as string;
          const docSlugs = args?.doc_slugs as string[] | undefined;

          if (!query) {
            logDebug('Validation error', { query });
            throw new Error("query is required");
          }

          logDebug(`Executing search_all_docs`, { query, filter: docSlugs });
          
          const results = await searchAllDocs(query, docSlugs);

          logDebug('search_all_docs response prepared', { count: results.length });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        case "get_doc_index": {
          const docSlug = args?.doc_slug as string;

          if (!docSlug) {
            logDebug('Validation error', { docSlug });
            throw new Error("doc_slug is required");
          }

          logDebug(`Executing get_doc_index`, { docSlug });
          
          const index = await fetchDocIndex(docSlug);

          const response = {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    doc: docSlug,
                    total_entries: index.length,
                    entries: index.slice(0, 100),
                    truncated: index.length > 100,
                  },
                  null,
                  2
                ),
              },
            ],
          };

          logDebug('get_doc_index response prepared', { total: index.length, returned: Math.min(index.length, 100) });
          return response;
        }

        default: {
          logDebug(`Unknown tool requested`, { name });
          throw new Error(`Unknown tool: ${name}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logDebug('Tool call failed', { name, error: errorMessage });
      
      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  const devDocsServer: DevDocsServer = {
    server,
    async listDocs(filter?: string) {
      logDebug('listDocs wrapper called', { filter });
      const docs = await fetchDocsList();
      
      if (filter && typeof filter === "string") {
        const f = filter.toLowerCase();
        const filtered = docs.filter(
          doc => doc.name.toLowerCase().includes(f) ||
                 doc.slug.toLowerCase().includes(f)
        );
        logDebug('listDocs wrapper result', { count: filtered.length });
        return filtered;
      }
      
      logDebug('listDocs wrapper result (unfiltered)', { count: docs.length });
      return docs;
    },
    
    async searchInDoc(slug: string, query: string) {
      logDebug('searchInDoc wrapper called', { slug, query });
      const results = await searchInDoc(slug, query);
      logDebug('searchInDoc wrapper result', { count: results.length, slug, query });
      return results;
    },
    
    async fetchDocContent(slug: string, path: string) {
      logDebug('fetchDocContent wrapper called', { slug, path });
      const content = await fetchDocContent(slug, path);
      logDebug('fetchDocContent wrapper result', { length: content.length });
      return content;
    },
    
    async searchAllDocs(query: string, docSlugs?: string[]) {
      logDebug('searchAllDocs wrapper called', { query, slugs: docSlugs?.length });
      const results = await searchAllDocs(query, docSlugs);
      logDebug('searchAllDocs wrapper result', { count: results.length });
      return results;
    },
    
    async fetchDocIndex(slug: string) {
      logDebug('fetchDocIndex wrapper called', { slug });
      const index = await fetchDocIndex(slug);
      logDebug('fetchDocIndex wrapper result', { count: index.length, slug });
      return index;
    },
  };

  logDebug('MCP server created and ready');
  return devDocsServer;
}

export { createMcpServer, DEVDOCS_BASE_URL, DEVDOCS_DOCUMENTS_URL };
