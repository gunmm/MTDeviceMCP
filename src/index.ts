import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"

// 三方工具
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { randomUUID } from "node:crypto";

// 基础配置
import config from "./config.js";
// 导入工具
import { Tools } from "./tools.js";
// 导入 Prompts
import { Prompt } from "./prompts.js";
// 导入资源
import { Resource } from "./resources.js";

// 启动模式
let mode = process.env.MILU_MCP_RUN_MODE ?? "stdio";

/**
 * 每个 session (每个 token) 、对应一个 server
 */
function setupServer(cookie: string, token: string): McpServer {
    // 创建服务
    let server = new McpServer({
        name: config.APP_NAME,
        title: config.description,
        version: config.APP_VERSION,
        capabilities: {
            resources: {},
            tools: {},
            prompts: {}
        },
    });
    // 注册工具
    let tools = new Tools(server, cookie, token);
    tools.setup();
    // 注册 Prompts
    let prompts = new Prompt(server);
    prompts.setup();
    // 注册资源
    let resources = new Resource(server);
    resources.setup();
    return server;
}

async function startStdioServer() {
    // 配置工具
    let cookie = process.env.MTAK ?? "";
    const transport = new StdioServerTransport();
    await setupServer(cookie, "").connect(transport);
    console.log(`MTDeviceMCP MCP Server running on stdio appVer=${config.APP_VERSION}`);
}

async function startHttpServer() {
    let port = process.env.MILU_MCP_PORT ?? 7531;
    let app = express();
    app.use(
        cors({
            origin: ['*'],
            exposedHeaders: ['mcp-session-id'],
            allowedHeaders: ['Content-Type', 'mcp-session-id'],
        })
    );
    app.use(cookieParser());
    app.use(express.json());

    // 请求日志
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        console.log(`  Headers: ${JSON.stringify(req.headers)}`);
        if (req.body && Object.keys(req.body).length > 0) {
            console.log(`  Body: ${JSON.stringify(req.body)}`);
        }
        next();
    });

    let appid = process.env.MILU_MCP_APPID ?? "1291668";
    let secret = process.env.MILU_MCP_SECRET ?? "";

    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
    app.post('/mcp', async (req, res) => {
        try {
            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            let transport: StreamableHTTPServerTransport;

            if (sessionId && transports[sessionId]) {
                console.log(`[MCP] 🔄 Reusing existing session: ${sessionId}`);
                transport = transports[sessionId];
            } else if (!sessionId && isInitializeRequest(req.body)) {
                console.log(`[MCP] 🆕 New initialize request`);
                let token = (req.headers["mtak"] ?? "") as string;

                let server = setupServer("", token);
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (newSessionId) => {
                        console.log(`[MCP] 🎉 Session initialized: ${newSessionId}`);
                        transports[newSessionId] = transport;
                    },
                });
                transport.onclose = () => {
                    console.log(`[MCP] ❌ Session closed: ${transport.sessionId}`);
                    if (transport.sessionId) {
                        delete transports[transport.sessionId];
                    }
                };
                await server.connect(transport);
                console.log(`[MCP] ✅ Server connected to transport`);
            } else {
                console.warn(`[MCP] ⚠️ Invalid request: no valid session ID`);
                console.warn(`  sessionId: ${sessionId}`);
                console.warn(`  isInitializeRequest: ${isInitializeRequest(req.body)}`);
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
                    id: null,
                });
                return;
            }

            console.log(`[MCP] 📩 Handling request for session=${transport.sessionId}`);
            await transport.handleRequest(req, res, req.body);
            console.log(`[MCP] 📤 Finished handling request for session=${transport.sessionId}`);
        } catch (error) {
            console.error(`[MCP] 💥 Error handling POST /mcp:`, error);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: { code: -32001, message: 'Internal Server Error: ' + (error instanceof Error ? error.message : 'Unknown error') },
                    id: null,
                });
            }
        }
    });

    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
        try {
            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            console.log(`[MCP] 🔎 ${req.method} /mcp with sessionId=${sessionId}`);
            if (!sessionId || !transports[sessionId]) {
                console.warn(`[MCP] ⚠️ Invalid or missing session ID`);
                res.status(400).send('Invalid or missing session ID');
                return;
            }
            const transport = transports[sessionId];
            await transport.handleRequest(req, res);
            console.log(`[MCP] 📤 Finished ${req.method} for session=${sessionId}`);
        } catch (error) {
            console.error(`[MCP] 💥 Error handling ${req.method} /mcp:`, error);
            if (!res.headersSent) {
                res.status(500).send('Internal Server Error');
            }
        }
    };

    app.get('/mcp', handleSessionRequest);
    app.delete('/mcp', handleSessionRequest);

    app.listen(port, () => {
        console.log(`🚀 MTDeviceMCP MCP Server appVer=${config.APP_VERSION}, Streamable HTTP Server listening on port ${port}`);
    }).on('error', (error) => {
        console.error(`❌ Failed to start server on port ${port}:`, error);
    });
}

async function main() {
    if (mode == "sse") {
        await startHttpServer();
    } else {
        await startStdioServer();
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});