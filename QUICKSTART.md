# Quick Start Guide

Get the DevDocs MCP server running in 5 minutes!

## Prerequisites Check

Make sure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ Claude Desktop installed

## Installation Steps

### 1. Install Dependencies
```bash
cd /path/to/apidocs
npm install
```

This will automatically build the project (via the `prepare` script).

### 2. Find Your Absolute Path
```bash
pwd
```

Copy the output - you'll need it for configuration.

### 3. Configure Claude Desktop

**macOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: Edit `%APPDATA%/Claude/claude_desktop_config.json`

Add this configuration (replace `/YOUR/PATH/HERE` with your actual path from step 2):

```json
{
  "mcpServers": {
    "devdocs": {
      "command": "node",
      "args": ["/YOUR/PATH/HERE/apidocs/build/index.js"]
    }
  }
}
```

### 4. Restart Claude Desktop

Completely quit and restart Claude Desktop.

### 5. Test It!

In a new Claude conversation, try:

```
"List all Python documentation available"
```

or

```
"Search for 'async await' in JavaScript docs"
```

If Claude can access documentation, you're all set! 🎉

## Verification

To verify the installation works before configuring Claude Desktop:

```bash
npm test
```

You should see:
```
Testing DevDocs API access...

1. Fetching docs list...
   ✓ Found 779 documentation sets

2. Fetching JavaScript index...
   ✓ Found 1287 entries in JavaScript docs

3. Fetching Array.map documentation...
   ✓ Fetched 17874 bytes of content

All tests passed! ✓
```

## Troubleshooting

### Claude doesn't recognize the tools

1. **Check the path**: Make sure you used the absolute path (starts with `/` on macOS/Linux or `C:\` on Windows)
2. **Verify the build**: Run `ls build/index.js` - this file must exist
3. **Check the config file**: Make sure the JSON is valid (no trailing commas, proper quotes)
4. **Restart completely**: Fully quit Claude Desktop (not just close the window)

### Still not working?

1. Check Claude Desktop's logs:
   - **macOS**: `~/Library/Logs/Claude/`
   - **Windows**: `%APPDATA%/Claude/logs/`

2. Look for errors related to "devdocs" in the log files

3. Verify Node.js version: `node --version` (should be 18 or higher)

### Common Issues

**"Cannot find module"**: Run `npm install` again
**"Permission denied"**: Make sure the build directory is readable
**Tools don't appear**: Check that you restarted Claude Desktop completely

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Check out [EXAMPLES.md](EXAMPLES.md) for usage examples
- Start exploring the 600+ documentation sets available!

## Quick Reference

### Most Useful Commands to Try

```
"Show me React documentation"
"Search for 'authentication' in Django docs"
"How do I use async/await in JavaScript?"
"Compare routing in Express and Flask"
"What array methods are available in JavaScript?"
```

### Popular Documentation Slugs

- `javascript` - JavaScript
- `python~3.12` - Python 3.12
- `react` - React
- `typescript` - TypeScript
- `django~5.1` - Django
- `postgresql~17` - PostgreSQL
- `dom` - Web APIs
- `express` - Express.js

## Need More Help?

- Full documentation: [README.md](README.md)
- Usage examples: [EXAMPLES.md](EXAMPLES.md)
- Report issues on GitHub

---

**Pro Tip**: Once configured, you can ask Claude to search documentation as part of any conversation. For example: "I'm building a REST API with Flask - show me the routing documentation and help me set up endpoints."
