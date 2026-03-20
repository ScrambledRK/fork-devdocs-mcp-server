import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

const DEVDOCS_BASE_URL = "https://devdocs.io";
const DEVDOCS_DOCUMENTS_URL = "https://documents.devdocs.io";

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
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchDocsList(): Promise<DocMetadata[]> {
  const cached = getCached<DocMetadata[]>("docs_list");
  if (cached) return cached;

  const response = await fetch(`${DEVDOCS_BASE_URL}/docs.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch docs list: ${response.statusText}`);
  }
  const docs = (await response.json()) as DocMetadata[];
  setCache("docs_list", docs);
  return docs;
}

async function fetchDocIndex(slug: string): Promise<IndexEntry[]> {
  const cached = getCached<IndexEntry[]>(`index_${slug}`);
  if (cached) return cached;

  const response = await fetch(`${DEVDOCS_DOCUMENTS_URL}/${slug}/index.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch index for ${slug}: ${response.statusText}`);
  }

  const rawIndex = (await response.json()) as any;
  const entries: IndexEntry[] = rawIndex.entries || [];

  setCache(`index_${slug}`, entries);
  return entries;
}

async function fetchDocContent(slug: string, path: string): Promise<string> {
  const cacheKey = `content_${slug}_${path}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${DEVDOCS_DOCUMENTS_URL}/${slug}/${path}.html`);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }

  const content = await response.text();
  setCache(cacheKey, content);
  return content;
}

async function searchInDoc(slug: string, query: string): Promise<SearchResult[]> {
  const index = await fetchDocIndex(slug);
  const lowerQuery = query.toLowerCase();

  return index
    .filter(entry => entry.name.toLowerCase().includes(lowerQuery))
    .map(entry => ({
      doc: slug,
      name: entry.name,
      path: entry.path || entry.name.toLowerCase().replace(/\s+/g, '-'),
      type: entry.type,
      url: `${DEVDOCS_BASE_URL}/${slug}/${entry.path || entry.name.toLowerCase().replace(/\s+/g, '-')}`,
    }))
    .slice(0, 20);
}

async function searchAllDocs(query: string, docFilter?: string[]): Promise<SearchResult[]> {
  const docs = await fetchDocsList();
  const docsToSearch = docFilter && docFilter.length > 0
    ? docs.filter(doc => docFilter.includes(doc.slug))
    : docs.slice(0, 20);

  const results: SearchResult[] = [];

  for (const doc of docsToSearch) {
    try {
      const docResults = await searchInDoc(doc.slug, query);
      results.push(...docResults);

      if (results.length >= 50) {
        break;
      }
    } catch (error) {
      console.error(`Failed to search in ${doc.slug}:`, error);
    }
  }

  return results.slice(0, 50);
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
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_docs": {
          const docs = await fetchDocsList();
          let filteredDocs = docs;

          if (args?.filter && typeof args.filter === "string") {
            const filter = args.filter.toLowerCase();
            filteredDocs = docs.filter(
              doc => doc.name.toLowerCase().includes(filter) ||
                     doc.slug.toLowerCase().includes(filter)
            );
          }

          return {
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
        }

        case "search_doc": {
          const docSlug = args?.doc_slug as string;
          const query = args?.query as string;

          if (!docSlug || !query) {
            throw new Error("doc_slug and query are required");
          }

          const results = await searchInDoc(docSlug, query);

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
            throw new Error("doc_slug and path are required");
          }

          const content = await fetchDocContent(docSlug, path);

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
            throw new Error("query is required");
          }

          const results = await searchAllDocs(query, docSlugs);

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
            throw new Error("doc_slug is required");
          }

          const index = await fetchDocIndex(docSlug);

          return {
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
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
      const docs = await fetchDocsList();
      
      if (filter && typeof filter === "string") {
        const f = filter.toLowerCase();
        return docs.filter(
          doc => doc.name.toLowerCase().includes(f) ||
                 doc.slug.toLowerCase().includes(f)
        );
      }
      
      return docs;
    },
    
    async searchInDoc(slug: string, query: string) {
      return await searchInDoc(slug, query);
    },
    
    async fetchDocContent(slug: string, path: string) {
      return await fetchDocContent(slug, path);
    },
    
    async searchAllDocs(query: string, docSlugs?: string[]) {
      return await searchAllDocs(query, docSlugs);
    },
    
    async fetchDocIndex(slug: string) {
      return await fetchDocIndex(slug);
    },
  };

  return devDocsServer;
}

export { createMcpServer, DEVDOCS_BASE_URL, DEVDOCS_DOCUMENTS_URL };
