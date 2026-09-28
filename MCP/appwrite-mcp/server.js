#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, Databases, ID, Query } from "node-appwrite";

// ── Appwrite client setup ─────────────────────────────────────────────────────
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT;
const APPWRITE_API_KEY  = process.env.APPWRITE_API_KEY;

if (!APPWRITE_PROJECT || !APPWRITE_API_KEY) {
  process.stderr.write("[appwrite-mcp] ERROR: APPWRITE_PROJECT and APPWRITE_API_KEY env vars are required.\n");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// ── Helpers ───────────────────────────────────────────────────────────────────
function ok(data)  { return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }; }
function err(e)    { return { content: [{ type: "text", text: `ERROR: ${e?.message || String(e)}` }], isError: true }; }

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  // ── DATABASE ────────────────────────────────────────────────────────────────
  {
    name: "list_databases",
    description: "Lista todos os databases do projeto Appwrite.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_database",
    description: "Cria um novo database.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: { type: "string", description: "ID único do database (use 'unique()' para gerar automaticamente)." },
        name:       { type: "string", description: "Nome do database." },
        enabled:    { type: "boolean", description: "Se o database está habilitado. Padrão: true." },
      },
      required: ["databaseId", "name"],
    },
  },
  {
    name: "get_database",
    description: "Retorna informações de um database pelo ID.",
    inputSchema: {
      type: "object",
      properties: { databaseId: { type: "string" } },
      required: ["databaseId"],
    },
  },
  {
    name: "update_database",
    description: "Atualiza o nome ou estado de habilitação de um database.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId: { type: "string" },
        name:       { type: "string" },
        enabled:    { type: "boolean" },
      },
      required: ["databaseId", "name"],
    },
  },
  {
    name: "delete_database",
    description: "Deleta um database e todas as suas collections e documentos.",
    inputSchema: {
      type: "object",
      properties: { databaseId: { type: "string" } },
      required: ["databaseId"],
    },
  },

  // ── COLLECTIONS ─────────────────────────────────────────────────────────────
  {
    name: "list_collections",
    description: "Lista todas as collections de um database.",
    inputSchema: {
      type: "object",
      properties: { databaseId: { type: "string" } },
      required: ["databaseId"],
    },
  },
  {
    name: "create_collection",
    description: "Cria uma nova collection em um database.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:    { type: "string" },
        collectionId:  { type: "string", description: "ID único (use 'unique()' para gerar)." },
        name:          { type: "string" },
        permissions:   { type: "array",  items: { type: "string" }, description: "Ex: [\"read(\\\"any\\\")\"]" },
        documentSecurity: { type: "boolean", description: "Permite permissões por documento." },
        enabled:       { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "name"],
    },
  },
  {
    name: "get_collection",
    description: "Retorna informações de uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
      },
      required: ["databaseId", "collectionId"],
    },
  },
  {
    name: "update_collection",
    description: "Atualiza nome, permissões ou estado de uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:       { type: "string" },
        collectionId:     { type: "string" },
        name:             { type: "string" },
        permissions:      { type: "array", items: { type: "string" } },
        documentSecurity: { type: "boolean" },
        enabled:          { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "name"],
    },
  },
  {
    name: "delete_collection",
    description: "Deleta uma collection e todos os seus documentos.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
      },
      required: ["databaseId", "collectionId"],
    },
  },

  // ── ATTRIBUTES (DDL de campos) ───────────────────────────────────────────────
  {
    name: "list_attributes",
    description: "Lista todos os atributos (campos) de uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
      },
      required: ["databaseId", "collectionId"],
    },
  },
  {
    name: "create_string_attribute",
    description: "Cria um atributo do tipo string em uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        size:         { type: "number", description: "Tamanho máximo (1–1073741824)." },
        required:     { type: "boolean" },
        default:      { type: "string" },
        array:        { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "key", "size", "required"],
    },
  },
  {
    name: "create_integer_attribute",
    description: "Cria um atributo do tipo integer.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        required:     { type: "boolean" },
        min:          { type: "number" },
        max:          { type: "number" },
        default:      { type: "number" },
        array:        { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "key", "required"],
    },
  },
  {
    name: "create_float_attribute",
    description: "Cria um atributo do tipo float.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        required:     { type: "boolean" },
        min:          { type: "number" },
        max:          { type: "number" },
        default:      { type: "number" },
        array:        { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "key", "required"],
    },
  },
  {
    name: "create_boolean_attribute",
    description: "Cria um atributo do tipo boolean.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        required:     { type: "boolean" },
        default:      { type: "boolean" },
        array:        { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "key", "required"],
    },
  },
  {
    name: "create_email_attribute",
    description: "Cria um atributo do tipo email.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        required:     { type: "boolean" },
        default:      { type: "string" },
        array:        { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "key", "required"],
    },
  },
  {
    name: "create_datetime_attribute",
    description: "Cria um atributo do tipo datetime.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        required:     { type: "boolean" },
        default:      { type: "string" },
        array:        { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "key", "required"],
    },
  },
  {
    name: "create_enum_attribute",
    description: "Cria um atributo do tipo enum (lista de valores permitidos).",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        elements:     { type: "array", items: { type: "string" }, description: "Valores permitidos." },
        required:     { type: "boolean" },
        default:      { type: "string" },
        array:        { type: "boolean" },
      },
      required: ["databaseId", "collectionId", "key", "elements", "required"],
    },
  },
  {
    name: "create_relationship_attribute",
    description: "Cria um atributo de relacionamento entre collections (1:1, 1:N, N:M).",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:          { type: "string" },
        collectionId:        { type: "string" },
        relatedCollectionId: { type: "string" },
        type:                { type: "string", enum: ["oneToOne","manyToOne","manyToMany","oneToMany"] },
        twoWay:              { type: "boolean" },
        key:                 { type: "string" },
        twoWayKey:           { type: "string" },
        onDelete:            { type: "string", enum: ["cascade","restrict","setNull"] },
      },
      required: ["databaseId", "collectionId", "relatedCollectionId", "type"],
    },
  },
  {
    name: "delete_attribute",
    description: "Deleta um atributo de uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
      },
      required: ["databaseId", "collectionId", "key"],
    },
  },

  // ── INDEXES ──────────────────────────────────────────────────────────────────
  {
    name: "list_indexes",
    description: "Lista todos os índices de uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
      },
      required: ["databaseId", "collectionId"],
    },
  },
  {
    name: "create_index",
    description: "Cria um índice em uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
        type:         { type: "string", enum: ["key","unique","fulltext"] },
        attributes:   { type: "array", items: { type: "string" } },
        orders:       { type: "array", items: { type: "string", enum: ["ASC","DESC"] } },
      },
      required: ["databaseId", "collectionId", "key", "type", "attributes"],
    },
  },
  {
    name: "delete_index",
    description: "Deleta um índice de uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        key:          { type: "string" },
      },
      required: ["databaseId", "collectionId", "key"],
    },
  },

  // ── DOCUMENTS (DML) ──────────────────────────────────────────────────────────
  {
    name: "list_documents",
    description: "Lista documentos de uma collection (suporta queries).",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        queries:      { type: "array", items: { type: "string" }, description: "Ex: [\"limit(10)\", \"orderDesc(\\\"$createdAt\\\")\"]" },
      },
      required: ["databaseId", "collectionId"],
    },
  },
  {
    name: "create_document",
    description: "Cria um documento em uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        documentId:   { type: "string", description: "Use 'unique()' para gerar automaticamente." },
        data:         { type: "object", description: "Campos do documento." },
        permissions:  { type: "array", items: { type: "string" } },
      },
      required: ["databaseId", "collectionId", "documentId", "data"],
    },
  },
  {
    name: "get_document",
    description: "Retorna um documento pelo ID.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        documentId:   { type: "string" },
      },
      required: ["databaseId", "collectionId", "documentId"],
    },
  },
  {
    name: "update_document",
    description: "Atualiza campos de um documento existente.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        documentId:   { type: "string" },
        data:         { type: "object" },
        permissions:  { type: "array", items: { type: "string" } },
      },
      required: ["databaseId", "collectionId", "documentId", "data"],
    },
  },
  {
    name: "delete_document",
    description: "Deleta um documento de uma collection.",
    inputSchema: {
      type: "object",
      properties: {
        databaseId:   { type: "string" },
        collectionId: { type: "string" },
        documentId:   { type: "string" },
      },
      required: ["databaseId", "collectionId", "documentId"],
    },
  },
];

// ── Tool handler ───────────────────────────────────────────────────────────────
async function handleTool(name, args) {
  try {
    switch (name) {
      // databases
      case "list_databases":         return ok(await databases.list());
      case "create_database":        return ok(await databases.create(args.databaseId === "unique()" ? ID.unique() : args.databaseId, args.name, args.enabled ?? true));
      case "get_database":           return ok(await databases.get(args.databaseId));
      case "update_database":        return ok(await databases.update(args.databaseId, args.name, args.enabled));
      case "delete_database":        return ok(await databases.delete(args.databaseId));
      // collections
      case "list_collections":       return ok(await databases.listCollections(args.databaseId));
      case "create_collection":      return ok(await databases.createCollection(args.databaseId, args.collectionId === "unique()" ? ID.unique() : args.collectionId, args.name, args.permissions, args.documentSecurity, args.enabled));
      case "get_collection":         return ok(await databases.getCollection(args.databaseId, args.collectionId));
      case "update_collection":      return ok(await databases.updateCollection(args.databaseId, args.collectionId, args.name, args.permissions, args.documentSecurity, args.enabled));
      case "delete_collection":      return ok(await databases.deleteCollection(args.databaseId, args.collectionId));
      // attributes
      case "list_attributes":        return ok(await databases.listAttributes(args.databaseId, args.collectionId));
      case "create_string_attribute":   return ok(await databases.createStringAttribute(args.databaseId, args.collectionId, args.key, args.size, args.required, args.default, args.array));
      case "create_integer_attribute":  return ok(await databases.createIntegerAttribute(args.databaseId, args.collectionId, args.key, args.required, args.min, args.max, args.default, args.array));
      case "create_float_attribute":    return ok(await databases.createFloatAttribute(args.databaseId, args.collectionId, args.key, args.required, args.min, args.max, args.default, args.array));
      case "create_boolean_attribute":  return ok(await databases.createBooleanAttribute(args.databaseId, args.collectionId, args.key, args.required, args.default, args.array));
      case "create_email_attribute":    return ok(await databases.createEmailAttribute(args.databaseId, args.collectionId, args.key, args.required, args.default, args.array));
      case "create_datetime_attribute": return ok(await databases.createDatetimeAttribute(args.databaseId, args.collectionId, args.key, args.required, args.default, args.array));
      case "create_enum_attribute":     return ok(await databases.createEnumAttribute(args.databaseId, args.collectionId, args.key, args.elements, args.required, args.default, args.array));
      case "create_relationship_attribute": return ok(await databases.createRelationshipAttribute(args.databaseId, args.collectionId, args.relatedCollectionId, args.type, args.twoWay, args.key, args.twoWayKey, args.onDelete));
      case "delete_attribute":       return ok(await databases.deleteAttribute(args.databaseId, args.collectionId, args.key));
      // indexes
      case "list_indexes":           return ok(await databases.listIndexes(args.databaseId, args.collectionId));
      case "create_index":           return ok(await databases.createIndex(args.databaseId, args.collectionId, args.key, args.type, args.attributes, args.orders));
      case "delete_index":           return ok(await databases.deleteIndex(args.databaseId, args.collectionId, args.key));
      // documents
      case "list_documents":         return ok(await databases.listDocuments(args.databaseId, args.collectionId, args.queries));
      case "create_document":        return ok(await databases.createDocument(args.databaseId, args.collectionId, args.documentId === "unique()" ? ID.unique() : args.documentId, args.data, args.permissions));
      case "get_document":           return ok(await databases.getDocument(args.databaseId, args.collectionId, args.documentId));
      case "update_document":        return ok(await databases.updateDocument(args.databaseId, args.collectionId, args.documentId, args.data, args.permissions));
      case "delete_document":        return ok(await databases.deleteDocument(args.databaseId, args.collectionId, args.documentId));
      default:                       return err(new Error(`Ferramenta desconhecida: ${name}`));
    }
  } catch (e) {
    return err(e);
  }
}

// ── MCP Server ─────────────────────────────────────────────────────────────────
const server = new Server(
  { name: "appwrite-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (req) =>
  handleTool(req.params.name, req.params.arguments ?? {})
);

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("[appwrite-mcp] Servidor MCP Appwrite iniciado.\n");
