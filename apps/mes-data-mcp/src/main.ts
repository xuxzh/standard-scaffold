import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadMesDatabaseConfig } from "./config.js";
import { MesDatabase } from "./mes-database.js";
import { registerMesTools } from "./tools.js";

async function main(): Promise<void> {
  const database = new MesDatabase(loadMesDatabaseConfig());
  const server = new McpServer({
    name: "mes-data",
    version: "0.0.0",
  });
  registerMesTools(server, database);

  await server.connect(new StdioServerTransport());
}

void main().catch(() => {
  process.stderr.write("MES data MCP failed to start\n");
  process.exitCode = 1;
});
