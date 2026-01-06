# DevDocs MCP Server - Usage Examples

This document provides practical examples of using the DevDocs MCP server through Claude Desktop.

## Getting Started

Once you've configured the server in Claude Desktop (see README.md), you can use these tools in your conversations with Claude.

## Example Workflows

### 1. Finding Python Documentation

**Scenario**: You want to learn about Python list comprehensions.

**Conversation Flow**:
```
You: "I need to understand Python list comprehensions"

Claude will:
1. Use list_docs with filter "python" to find Python documentation sets
2. Use search_doc with doc_slug "python~3.12" and query "list comprehension"
3. Use get_doc_content to fetch the detailed documentation
4. Explain the concept with examples from the official docs
```

**Equivalent Tool Calls**:
```json
// Step 1: Find Python docs
{
  "tool": "list_docs",
  "arguments": {
    "filter": "python"
  }
}

// Step 2: Search for list comprehensions
{
  "tool": "search_doc",
  "arguments": {
    "doc_slug": "python~3.12",
    "query": "list comprehension"
  }
}

// Step 3: Get the content
{
  "tool": "get_doc_content",
  "arguments": {
    "doc_slug": "python~3.12",
    "path": "tutorial/datastructures"
  }
}
```

### 2. Comparing Frameworks

**Scenario**: You want to compare routing in Express vs Django vs Flask.

**Conversation Flow**:
```
You: "How does routing work in Express, Django, and Flask? Can you compare them?"

Claude will:
1. Use search_all_docs to search for "routing" across these frameworks
2. Use get_doc_content multiple times to fetch routing docs from each
3. Present a comparison of routing approaches
```

**Equivalent Tool Calls**:
```json
{
  "tool": "search_all_docs",
  "arguments": {
    "query": "routing",
    "doc_slugs": ["express", "django~5.1", "flask~3.1"]
  }
}
```

### 3. Exploring a New Library

**Scenario**: You want to explore what's available in the React documentation.

**Conversation Flow**:
```
You: "What topics are covered in the React documentation?"

Claude will:
1. Use get_doc_index with doc_slug "react" to get the full table of contents
2. Summarize the main sections and topics available
```

**Equivalent Tool Calls**:
```json
{
  "tool": "get_doc_index",
  "arguments": {
    "doc_slug": "react"
  }
}
```

### 4. Finding Specific API Methods

**Scenario**: You need to find all array methods in JavaScript.

**Conversation Flow**:
```
You: "Show me all JavaScript array methods"

Claude will:
1. Use search_doc with doc_slug "javascript" and query "array"
2. Filter results to show array-related entries
3. Optionally fetch details for specific methods you're interested in
```

**Equivalent Tool Calls**:
```json
{
  "tool": "search_doc",
  "arguments": {
    "doc_slug": "javascript",
    "query": "array"
  }
}
```

### 5. Multi-Language Search

**Scenario**: You want to find how to work with JSON in different languages.

**Conversation Flow**:
```
You: "How do I parse JSON in Python, JavaScript, and Go?"

Claude will:
1. Use search_all_docs with query "json parse"
2. Filter results for python, javascript, and go
3. Fetch and explain the JSON parsing approaches for each language
```

**Equivalent Tool Calls**:
```json
{
  "tool": "search_all_docs",
  "arguments": {
    "query": "json parse",
    "doc_slugs": ["python~3.12", "javascript", "go"]
  }
}
```

### 6. Database Query Help

**Scenario**: You need help with PostgreSQL window functions.

**Conversation Flow**:
```
You: "Explain PostgreSQL window functions with examples"

Claude will:
1. Use search_doc to find window function documentation in PostgreSQL
2. Use get_doc_content to fetch the detailed guide
3. Provide explanations with examples from the official documentation
```

**Equivalent Tool Calls**:
```json
{
  "tool": "search_doc",
  "arguments": {
    "doc_slug": "postgresql~17",
    "query": "window functions"
  }
}

{
  "tool": "get_doc_content",
  "arguments": {
    "doc_slug": "postgresql~17",
    "path": "tutorial-window"
  }
}
```

### 7. Learning Web APIs

**Scenario**: You want to understand the Fetch API.

**Conversation Flow**:
```
You: "How does the Fetch API work?"

Claude will:
1. Use search_doc with doc_slug "dom" (Web APIs) and query "fetch"
2. Get the Fetch API documentation
3. Explain with code examples
```

**Equivalent Tool Calls**:
```json
{
  "tool": "search_doc",
  "arguments": {
    "doc_slug": "dom",
    "query": "fetch"
  }
}
```

## Tips for Best Results

1. **Be Specific**: When asking about a specific library or framework, mention its name so Claude knows which documentation to search.

2. **Version Matters**: If you need a specific version (e.g., Python 3.12 vs 3.11), mention it. Otherwise, Claude will typically use the latest version.

3. **Multiple Perspectives**: Ask Claude to compare approaches across different technologies for a broader understanding.

4. **Explore First**: If you're new to a library, ask Claude to show you what's available in the documentation before diving into specific topics.

5. **Context is Key**: Provide context about what you're trying to build or solve, and Claude can find the most relevant documentation.

## Common Documentation Slugs

Here are some frequently used documentation slugs:

### Languages
- `javascript` - JavaScript
- `python~3.12` - Python 3.12
- `typescript` - TypeScript
- `rust` - Rust
- `go` - Go
- `ruby~3.3` - Ruby 3.3
- `php` - PHP
- `java` - Java

### Web Frameworks
- `react` - React
- `vue~3` - Vue.js 3
- `angular` - Angular
- `express` - Express.js
- `django~5.1` - Django 5.1
- `flask~3.1` - Flask 3.1
- `rails~7.2` - Ruby on Rails 7.2
- `nextjs` - Next.js

### Databases
- `postgresql~17` - PostgreSQL 17
- `mysql` - MySQL
- `mongodb` - MongoDB
- `redis` - Redis
- `sqlite` - SQLite

### Tools & Libraries
- `docker` - Docker
- `git` - Git
- `webpack` - webpack
- `numpy` - NumPy
- `pandas` - pandas
- `tensorflow` - TensorFlow

### Web APIs
- `dom` - Web APIs (DOM, Fetch, etc.)
- `html` - HTML
- `css` - CSS
- `http` - HTTP

## Advanced Usage

### Chaining Queries

You can ask Claude to perform multiple lookups in sequence:

```
You: "First show me what documentation is available for Redis, then find
information about Redis transactions, and finally explain how to use MULTI/EXEC"
```

### Filtering Large Results

When searching returns too many results:

```
You: "Search for 'test' in the Python documentation, but only show me entries
related to unit testing, not other kinds of tests"
```

### Code Generation with Documentation

Combine documentation lookup with code generation:

```
You: "Look up how to use SQLAlchemy's query API and write me a function that
queries users by email with proper error handling"
```

## Troubleshooting

### "Documentation not found" errors
- Use `list_docs` to verify the exact slug name
- Check if the documentation version is available (e.g., `python~3.12` vs `python~3.11`)

### Empty search results
- Try broader search terms
- Use `get_doc_index` to browse available topics
- Some documentation might use different terminology

### Slow responses
- First queries fetch data from DevDocs.io and may be slower
- Cached data (1 hour TTL) will respond instantly
- Searching across many documentation sets takes longer than single-doc searches

## Need Help?

If you encounter issues or have questions:
1. Check the main README.md for installation instructions
2. Verify your Claude Desktop configuration
3. Look at the DevDocs.io website to understand available documentation
4. Report issues on the GitHub repository
