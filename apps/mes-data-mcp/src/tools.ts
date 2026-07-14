import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  mesPresentationRequestV1Schema,
  type MesPresentationRequestV1,
} from "@repo/ai-visualization-contract";
import { z } from "zod";

import type { MesDatabase } from "./mes-database.js";

export const describeMesSchemaInputSchema = z
  .object({
    schema: z.string().trim().min(1).optional(),
  })
  .strict();

export const queryMesDataInputSchema = z
  .object({
    sql: z.string().trim().min(1),
  })
  .strict();

export const presentMesResultInputSchema = mesPresentationRequestV1Schema;

type MesDatabaseReader = Pick<MesDatabase, "query">;

export function createMesToolHandlers(database: MesDatabaseReader) {
  return {
    describeMesSchema: async (
      input: z.infer<typeof describeMesSchemaInputSchema>,
    ) => toTextContent(await database.query(createSchemaQuery(input.schema))),
    queryMesData: async (input: z.infer<typeof queryMesDataInputSchema>) =>
      toTextContent(await database.query(input.sql)),
    presentMesResult: async (input: MesPresentationRequestV1) =>
      toTextContent({ accepted: true, request: input }),
  };
}

export function registerMesTools(
  server: McpServer,
  database: MesDatabaseReader,
): void {
  const handlers = createMesToolHandlers(database);

  server.registerTool(
    "describe_mes_schema",
    {
      description: "Describe authorized MES tables, views, columns, and foreign keys.",
      inputSchema: describeMesSchemaInputSchema.shape,
    },
    handlers.describeMesSchema,
  );
  server.registerTool(
    "query_mes_data",
    {
      description: "Run a read-only MES analysis query with fixed resource limits.",
      inputSchema: queryMesDataInputSchema.shape,
    },
    handlers.queryMesData,
  );
  server.registerTool(
    "present_mes_result",
    {
      description:
        "Describe a controlled KPI, line/bar chart, and table presentation for the most recent MES aggregate query result.",
      inputSchema: presentMesResultInputSchema.shape,
    },
    handlers.presentMesResult,
  );
}

function createSchemaQuery(schema?: string): string {
  const schemaFilter = schema
    ? ` AND metadata.TABLE_SCHEMA = '${schema.replaceAll("'", "''")}'`
    : "";

  return `SELECT
  'object' AS metadata_type,
  metadata.TABLE_SCHEMA AS table_schema,
  metadata.TABLE_NAME AS table_name,
  metadata.TABLE_TYPE AS object_type,
  NULL AS column_name,
  NULL AS data_type,
  NULL AS referenced_schema,
  NULL AS referenced_table,
  NULL AS referenced_column
FROM INFORMATION_SCHEMA.TABLES AS metadata
WHERE 1 = 1${schemaFilter}
UNION ALL
SELECT
  'column',
  metadata.TABLE_SCHEMA,
  metadata.TABLE_NAME,
  NULL,
  metadata.COLUMN_NAME,
  metadata.DATA_TYPE,
  NULL,
  NULL,
  NULL
FROM INFORMATION_SCHEMA.COLUMNS AS metadata
WHERE 1 = 1${schemaFilter}
UNION ALL
SELECT
  'foreign_key',
  foreign_key.TABLE_SCHEMA,
  foreign_key.TABLE_NAME,
  'FOREIGN KEY',
  foreign_key_column.COLUMN_NAME,
  NULL,
  referenced_key.TABLE_SCHEMA,
  referenced_key.TABLE_NAME,
  referenced_key_column.COLUMN_NAME
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS metadata
JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS foreign_key
  ON foreign_key.CONSTRAINT_CATALOG = metadata.CONSTRAINT_CATALOG
 AND foreign_key.CONSTRAINT_SCHEMA = metadata.CONSTRAINT_SCHEMA
 AND foreign_key.CONSTRAINT_NAME = metadata.CONSTRAINT_NAME
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS foreign_key_column
  ON foreign_key_column.CONSTRAINT_CATALOG = foreign_key.CONSTRAINT_CATALOG
 AND foreign_key_column.CONSTRAINT_SCHEMA = foreign_key.CONSTRAINT_SCHEMA
 AND foreign_key_column.CONSTRAINT_NAME = foreign_key.CONSTRAINT_NAME
JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS referenced_key
  ON referenced_key.CONSTRAINT_CATALOG = metadata.UNIQUE_CONSTRAINT_CATALOG
 AND referenced_key.CONSTRAINT_SCHEMA = metadata.UNIQUE_CONSTRAINT_SCHEMA
 AND referenced_key.CONSTRAINT_NAME = metadata.UNIQUE_CONSTRAINT_NAME
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS referenced_key_column
  ON referenced_key_column.CONSTRAINT_CATALOG = referenced_key.CONSTRAINT_CATALOG
 AND referenced_key_column.CONSTRAINT_SCHEMA = referenced_key.CONSTRAINT_SCHEMA
 AND referenced_key_column.CONSTRAINT_NAME = referenced_key.CONSTRAINT_NAME
 AND referenced_key_column.ORDINAL_POSITION = foreign_key_column.ORDINAL_POSITION
WHERE 1 = 1${schema ? ` AND foreign_key.TABLE_SCHEMA = '${schema.replaceAll("'", "''")}'` : ""}
ORDER BY table_schema, table_name, metadata_type, column_name;`;
}

function toTextContent(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}
