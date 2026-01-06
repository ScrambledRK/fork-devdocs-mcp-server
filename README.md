# DevDocs MCP Server

A Model Context Protocol (MCP) server that provides access to the extensive DevDocs.io API documentation library. Access 600+ documentation sets including Python, JavaScript, React, Django, PostgreSQL, and many more directly through Claude Desktop or any MCP-compatible client.

## Features

- **List Documentation Sets**: Browse all 600+ available documentation libraries
- **Search Within Docs**: Search for specific topics within a documentation set
- **Global Search**: Search across multiple documentation sets simultaneously
- **Fetch Content**: Retrieve full HTML documentation content
- **Browse Index**: View complete table of contents for any documentation
- **Smart Caching**: Automatic caching for improved performance
- **Type Safety**: Built with TypeScript for reliability

## Available Documentation

DevDocs.io aggregates documentation from numerous sources including:

- **Languages**: Python, JavaScript, TypeScript, Rust, Go, C++, Ruby, PHP, Java, Kotlin, Swift, and 30+ more
- **Frameworks**: React, Vue, Angular, Django, Flask, Laravel, Rails, Express, Next.js, and many more
- **Libraries**: NumPy, pandas, PyTorch, TensorFlow, D3.js, Lodash, jQuery
- **Tools**: Docker, Kubernetes, Git, webpack, npm, CMake
- **Databases**: PostgreSQL, MySQL, SQLite, Redis, MongoDB
- **Web APIs**: DOM, HTML, CSS, HTTP, Web APIs from MDN

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone or download this repository:
```bash
git clone <repository-url>
cd apidocs
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Configure Claude Desktop

Add this server to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "devdocs": {
      "command": "node",
      "args": ["/absolute/path/to/apidocs/build/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/apidocs` with the actual path to your installation.

## Tools

The server provides five powerful tools:

### 1. list_docs

List all available documentation sets with optional filtering.

**Parameters:**
- `filter` (optional): String to filter documentation by name

**Example:**
```json
{
  "filter": "python"
}
```

**Returns:** Array of documentation metadata including name, slug, version, links, and size.

### 2. search_doc

Search within a specific documentation set.

**Parameters:**
- `doc_slug` (required): Documentation slug (e.g., "javascript", "python~3.12", "react")
- `query` (required): Search query string

**Example:**
```json
{
  "doc_slug": "javascript",
  "query": "array map"
}
```

**Returns:** Array of matching entries with name, path, type, and full URL (limited to 20 results).

### 3. search_all_docs

Search across multiple documentation sets simultaneously.

**Parameters:**
- `query` (required): Search query string
- `doc_slugs` (optional): Array of specific documentation slugs to search

**Example:**
```json
{
  "query": "authentication",
  "doc_slugs": ["django~5.1", "flask~3.1", "express"]
}
```

**Returns:** Combined search results from multiple docs (limited to 50 results).

### 4. get_doc_content

Fetch the full HTML content for a specific documentation entry.

**Parameters:**
- `doc_slug` (required): Documentation slug
- `path` (required): Entry path (from search results)

**Example:**
```json
{
  "doc_slug": "javascript",
  "path": "global_objects/array/map"
}
```

**Returns:** Full HTML content of the documentation entry.

### 5. get_doc_index

Get the complete index/table of contents for a documentation set.

**Parameters:**
- `doc_slug` (required): Documentation slug

**Example:**
```json
{
  "doc_slug": "react"
}
```

**Returns:** Complete index with entry names, paths, and types (first 100 entries shown).

## Usage Examples

### Finding Python Documentation

1. List Python docs:
   - Tool: `list_docs`
   - Filter: `"python"`

2. Search for "list comprehension":
   - Tool: `search_doc`
   - doc_slug: `"python~3.12"`
   - query: `"list comprehension"`

3. Get the content:
   - Tool: `get_doc_content`
   - doc_slug: `"python~3.12"`
   - path: (from search results)

### Cross-Framework Search

Search for "routing" across web frameworks:
- Tool: `search_all_docs`
- query: `"routing"`
- doc_slugs: `["express", "django~5.1", "flask~3.1", "rails~7.2"]`

## Development

### Watch Mode

For development with auto-rebuild:
```bash
npm run watch
```

### Project Structure

```
apidocs/
├── src/
│   └── index.ts         # Main MCP server implementation
├── build/               # Compiled JavaScript (generated)
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## How It Works

1. **Data Source**: Fetches data from DevDocs.io public endpoints
2. **Caching**: Implements 1-hour cache to reduce API calls and improve performance
3. **Index Format**: DevDocs uses compact arrays `[name, path, type]` for efficient storage
4. **Content Delivery**: HTML partials are served for each documentation entry

## API Endpoints Used

- `https://devdocs.io/docs.json` - List of all documentation sets
- `https://documents.devdocs.io/{slug}/index.json` - Index for specific documentation
- `https://documents.devdocs.io/{slug}/{path}.html` - Content for specific entry

## Troubleshooting

### Server Not Showing Up in Claude Desktop

1. Verify the path in `claude_desktop_config.json` is absolute
2. Ensure you ran `npm run build`
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

### Search Returns No Results

- Verify the doc_slug is correct using `list_docs`
- Check that the documentation includes the term you're searching for
- Try a broader search query

### Performance Issues

- The server caches all requests for 1 hour
- First requests may be slower as data is fetched
- Subsequent requests will be much faster

## Credits and Attribution

This MCP server was built by analyzing and integrating with the DevDocs.io platform. Special thanks to:

### Core Infrastructure
- **[DevDocs.io](https://devdocs.io)** - The amazing documentation aggregation platform that makes this possible
- **[freeCodeCamp](https://github.com/freeCodeCamp/devdocs)** - Maintainers of the DevDocs open-source project
- **[Model Context Protocol SDK](https://github.com/modelcontextprotocol)** - Framework for building MCP servers

### Documentation and Research
- **[documents.devdocs.io](https://documents.devdocs.io)** - API endpoint for accessing documentation content
- **[SitePoint](https://www.sitepoint.com/look-devdocs-io/)** - Analysis and overview of DevDocs architecture
- **[GitHub Docs](https://docs.github.com)** - API documentation and best practices

### Technology Stack
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Node.js](https://nodejs.org/)** - Runtime environment
- **[node-fetch](https://github.com/node-fetch/node-fetch)** - HTTP client library

All documentation content is copyright of their respective owners and provided through DevDocs.io's public API.

For detailed attribution, see [CREDITS.md](CREDITS.md).

## License

MIT - See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Resources

- [DevDocs.io](https://devdocs.io) - Main documentation site
- [DevDocs GitHub](https://github.com/freeCodeCamp/devdocs) - Source code
- [MCP Documentation](https://modelcontextprotocol.io) - Learn about MCP
- [Claude Desktop](https://claude.ai/download) - Download Claude Desktop
