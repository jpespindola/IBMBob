#!/usr/bin/env python3
"""
server.py — Servidor MCP para o Appwrite (DDL + DML completos).
Usa mcp v2 (MCPServer) + SDK appwrite.
"""

import asyncio
import json
import os
import sys

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.permission import Permission
from appwrite.role import Role

from mcp.server.mcpserver import MCPServer
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# ── Configuração do cliente Appwrite ─────────────────────────────────────────
ENDPOINT = os.environ.get("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
PROJECT  = os.environ.get("APPWRITE_PROJECT",  "")
API_KEY  = os.environ.get("APPWRITE_API_KEY",  "")

if not PROJECT or not API_KEY:
    sys.stderr.write("[appwrite-mcp] ERRO: defina APPWRITE_PROJECT e APPWRITE_API_KEY.\n")
    sys.exit(1)

client = (
    Client()
    .set_endpoint(ENDPOINT)
    .set_project(PROJECT)
    .set_key(API_KEY)
)
databases = Databases(client)

# ── Helpers ───────────────────────────────────────────────────────────────────
def ok(data):
    return [TextContent(type="text", text=json.dumps(data, indent=2, default=str))]

def fail(e):
    return [TextContent(type="text", text=f"ERRO: {e}")]

def resolve_id(value: str) -> str:
    return ID.unique() if value == "unique()" else value

# ── Definição das ferramentas ─────────────────────────────────────────────────
TOOLS = [
    # Databases
    Tool(name="list_databases",   description="Lista todos os databases do projeto.", inputSchema={"type":"object","properties":{},"required":[]}),
    Tool(name="create_database",  description="Cria um novo database. Use 'unique()' em databaseId para gerar automaticamente.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"name":{"type":"string"},"enabled":{"type":"boolean"}},"required":["databaseId","name"]}),
    Tool(name="get_database",     description="Retorna informações de um database.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"}},"required":["databaseId"]}),
    Tool(name="update_database",  description="Atualiza nome ou estado de um database.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"name":{"type":"string"},"enabled":{"type":"boolean"}},"required":["databaseId","name"]}),
    Tool(name="delete_database",  description="Deleta um database e todo o seu conteúdo.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"}},"required":["databaseId"]}),
    # Collections
    Tool(name="list_collections",  description="Lista collections de um database.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"}},"required":["databaseId"]}),
    Tool(name="create_collection", description="Cria uma collection. Use 'unique()' em collectionId para gerar automaticamente.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"name":{"type":"string"},"permissions":{"type":"array","items":{"type":"string"}},"documentSecurity":{"type":"boolean"},"enabled":{"type":"boolean"}},"required":["databaseId","collectionId","name"]}),
    Tool(name="get_collection",    description="Retorna informações de uma collection.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"}},"required":["databaseId","collectionId"]}),
    Tool(name="update_collection", description="Atualiza uma collection.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"name":{"type":"string"},"permissions":{"type":"array","items":{"type":"string"}},"documentSecurity":{"type":"boolean"},"enabled":{"type":"boolean"}},"required":["databaseId","collectionId","name"]}),
    Tool(name="delete_collection", description="Deleta uma collection e todos os documentos.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"}},"required":["databaseId","collectionId"]}),
    # Attributes
    Tool(name="list_attributes",              description="Lista os atributos de uma collection.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"}},"required":["databaseId","collectionId"]}),
    Tool(name="create_string_attribute",      description="Cria um atributo string.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"size":{"type":"integer"},"required":{"type":"boolean"},"default":{"type":"string"},"array":{"type":"boolean"}},"required":["databaseId","collectionId","key","size","required"]}),
    Tool(name="create_integer_attribute",     description="Cria um atributo integer.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"required":{"type":"boolean"},"min":{"type":"integer"},"max":{"type":"integer"},"default":{"type":"integer"},"array":{"type":"boolean"}},"required":["databaseId","collectionId","key","required"]}),
    Tool(name="create_float_attribute",       description="Cria um atributo float.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"required":{"type":"boolean"},"min":{"type":"number"},"max":{"type":"number"},"default":{"type":"number"},"array":{"type":"boolean"}},"required":["databaseId","collectionId","key","required"]}),
    Tool(name="create_boolean_attribute",     description="Cria um atributo boolean.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"required":{"type":"boolean"},"default":{"type":"boolean"},"array":{"type":"boolean"}},"required":["databaseId","collectionId","key","required"]}),
    Tool(name="create_email_attribute",       description="Cria um atributo email.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"required":{"type":"boolean"},"default":{"type":"string"},"array":{"type":"boolean"}},"required":["databaseId","collectionId","key","required"]}),
    Tool(name="create_datetime_attribute",    description="Cria um atributo datetime.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"required":{"type":"boolean"},"default":{"type":"string"},"array":{"type":"boolean"}},"required":["databaseId","collectionId","key","required"]}),
    Tool(name="create_enum_attribute",        description="Cria um atributo enum.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"elements":{"type":"array","items":{"type":"string"}},"required":{"type":"boolean"},"default":{"type":"string"},"array":{"type":"boolean"}},"required":["databaseId","collectionId","key","elements","required"]}),
    Tool(name="create_relationship_attribute",description="Cria um relacionamento entre collections.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"relatedCollectionId":{"type":"string"},"type":{"type":"string","enum":["oneToOne","manyToOne","manyToMany","oneToMany"]},"twoWay":{"type":"boolean"},"key":{"type":"string"},"twoWayKey":{"type":"string"},"onDelete":{"type":"string","enum":["cascade","restrict","setNull"]}},"required":["databaseId","collectionId","relatedCollectionId","type"]}),
    Tool(name="delete_attribute",             description="Deleta um atributo.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"}},"required":["databaseId","collectionId","key"]}),
    # Indexes
    Tool(name="list_indexes",  description="Lista os índices de uma collection.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"}},"required":["databaseId","collectionId"]}),
    Tool(name="create_index",  description="Cria um índice.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"},"type":{"type":"string","enum":["key","unique","fulltext"]},"attributes":{"type":"array","items":{"type":"string"}},"orders":{"type":"array","items":{"type":"string"}}},"required":["databaseId","collectionId","key","type","attributes"]}),
    Tool(name="delete_index",  description="Deleta um índice.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"key":{"type":"string"}},"required":["databaseId","collectionId","key"]}),
    # Documents
    Tool(name="list_documents",  description="Lista documentos (suporta queries).", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"queries":{"type":"array","items":{"type":"string"}}},"required":["databaseId","collectionId"]}),
    Tool(name="create_document", description="Cria um documento. Use 'unique()' em documentId.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"documentId":{"type":"string"},"data":{"type":"object"},"permissions":{"type":"array","items":{"type":"string"}}},"required":["databaseId","collectionId","documentId","data"]}),
    Tool(name="get_document",    description="Retorna um documento pelo ID.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"documentId":{"type":"string"}},"required":["databaseId","collectionId","documentId"]}),
    Tool(name="update_document", description="Atualiza campos de um documento.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"documentId":{"type":"string"},"data":{"type":"object"},"permissions":{"type":"array","items":{"type":"string"}}},"required":["databaseId","collectionId","documentId","data"]}),
    Tool(name="delete_document", description="Deleta um documento.", inputSchema={"type":"object","properties":{"databaseId":{"type":"string"},"collectionId":{"type":"string"},"documentId":{"type":"string"}},"required":["databaseId","collectionId","documentId"]}),
]

# ── Handler das ferramentas ───────────────────────────────────────────────────
async def handle_tool(name: str, a: dict):
    try:
        match name:
            case "list_databases":    return ok(databases.list())
            case "create_database":   return ok(databases.create(resolve_id(a["databaseId"]), a["name"], a.get("enabled", True)))
            case "get_database":      return ok(databases.get(a["databaseId"]))
            case "update_database":   return ok(databases.update(a["databaseId"], a["name"], a.get("enabled")))
            case "delete_database":   return ok(databases.delete(a["databaseId"]))
            case "list_collections":  return ok(databases.list_collections(a["databaseId"]))
            case "create_collection": return ok(databases.create_collection(a["databaseId"], resolve_id(a["collectionId"]), a["name"], a.get("permissions"), a.get("documentSecurity"), a.get("enabled")))
            case "get_collection":    return ok(databases.get_collection(a["databaseId"], a["collectionId"]))
            case "update_collection": return ok(databases.update_collection(a["databaseId"], a["collectionId"], a["name"], a.get("permissions"), a.get("documentSecurity"), a.get("enabled")))
            case "delete_collection": return ok(databases.delete_collection(a["databaseId"], a["collectionId"]))
            case "list_attributes":              return ok(databases.list_attributes(a["databaseId"], a["collectionId"]))
            case "create_string_attribute":      return ok(databases.create_string_attribute(a["databaseId"], a["collectionId"], a["key"], a["size"], a["required"], a.get("default"), a.get("array", False)))
            case "create_integer_attribute":     return ok(databases.create_integer_attribute(a["databaseId"], a["collectionId"], a["key"], a["required"], a.get("min"), a.get("max"), a.get("default"), a.get("array", False)))
            case "create_float_attribute":       return ok(databases.create_float_attribute(a["databaseId"], a["collectionId"], a["key"], a["required"], a.get("min"), a.get("max"), a.get("default"), a.get("array", False)))
            case "create_boolean_attribute":     return ok(databases.create_boolean_attribute(a["databaseId"], a["collectionId"], a["key"], a["required"], a.get("default"), a.get("array", False)))
            case "create_email_attribute":       return ok(databases.create_email_attribute(a["databaseId"], a["collectionId"], a["key"], a["required"], a.get("default"), a.get("array", False)))
            case "create_datetime_attribute":    return ok(databases.create_datetime_attribute(a["databaseId"], a["collectionId"], a["key"], a["required"], a.get("default"), a.get("array", False)))
            case "create_enum_attribute":        return ok(databases.create_enum_attribute(a["databaseId"], a["collectionId"], a["key"], a["elements"], a["required"], a.get("default"), a.get("array", False)))
            case "create_relationship_attribute":return ok(databases.create_relationship_attribute(a["databaseId"], a["collectionId"], a["relatedCollectionId"], a["type"], a.get("twoWay", False), a.get("key"), a.get("twoWayKey"), a.get("onDelete", "setNull")))
            case "delete_attribute":             return ok(databases.delete_attribute(a["databaseId"], a["collectionId"], a["key"]))
            case "list_indexes":   return ok(databases.list_indexes(a["databaseId"], a["collectionId"]))
            case "create_index":   return ok(databases.create_index(a["databaseId"], a["collectionId"], a["key"], a["type"], a["attributes"], a.get("orders", [])))
            case "delete_index":   return ok(databases.delete_index(a["databaseId"], a["collectionId"], a["key"]))
            case "list_documents":  return ok(databases.list_documents(a["databaseId"], a["collectionId"], a.get("queries", [])))
            case "create_document": return ok(databases.create_document(a["databaseId"], a["collectionId"], resolve_id(a["documentId"]), a["data"], a.get("permissions")))
            case "get_document":    return ok(databases.get_document(a["databaseId"], a["collectionId"], a["documentId"]))
            case "update_document": return ok(databases.update_document(a["databaseId"], a["collectionId"], a["documentId"], a["data"], a.get("permissions")))
            case "delete_document": return ok(databases.delete_document(a["databaseId"], a["collectionId"], a["documentId"]))
            case _:                 return fail(f"Ferramenta desconhecida: {name}")
    except Exception as e:
        return fail(str(e))

# ── MCP Server (mcp v2) ───────────────────────────────────────────────────────
app = MCPServer("appwrite-mcp")

@app.list_tools()
async def list_tools():
    return TOOLS

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    return await handle_tool(name, arguments)

async def main():
    sys.stderr.write("[appwrite-mcp] Servidor MCP Appwrite (Python) iniciado.\n")
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
