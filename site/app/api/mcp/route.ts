import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { registerSearchTool, registerSourceTools } from 'fumadocs-core/mcp'
import { searchServer } from '@/lib/search'
import { docsLlms, source } from '@/lib/source'

// An MCP server for agents at /api/mcp, over streamable HTTP. Its tools are
// list_pages, get_page and search, over every version of the docs.
const handler = createMcpHandler(() => {
  const mcp = new McpServer({ name: 'ifloom-docs', version: '1.0.0' })
  registerSourceTools(mcp, source, docsLlms)
  registerSearchTool(mcp, searchServer)
  return mcp
})

export const GET = (request: Request) => handler.fetch(request)
export const POST = (request: Request) => handler.fetch(request)
export const DELETE = (request: Request) => handler.fetch(request)
