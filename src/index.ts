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
    
    // 添加请求日志中间件
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers)}`);
        next();
    });

    // OA自动授权 https://cf.meitu.com/confluence/x/kKneIg
    let appid = process.env.MILU_MCP_APPID ?? "1291668";
    let secret = process.env.MILU_MCP_SECRET ?? "";

    // 每个请求都会创建一个 transport，以 sessionId 为 key 缓存
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
    app.post('/mcp', async (req, res) => {
        try {
            console.log('Received POST /mcp request');
            console.log('Request body:', JSON.stringify(req.body, null, 2));
            
            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            let transport: StreamableHTTPServerTransport;
            if (sessionId && transports[sessionId]) {
                console.log(`Reusing existing session: ${sessionId}`);
                // 复用缓存
                transport = transports[sessionId];
            } else if (!sessionId && isInitializeRequest(req.body)) {
                console.log('Processing initialize request');
                let token = (req.headers["mtak"] ?? "") as string;
                let authCallback = (req.headers["mcp_auth_back"] ?? "http://localhost:7531/callback") as string;
                let redirectUrlStr = encodeURIComponent(authCallback);

                // https://oauth.meitu.com/oauth2/bind_apps?appid=1291668&chosen_appids=1291459%2C1291231&back_url=http%3A%2F%2Flocalhost%3A7531%2Fcallback

                let authUrl = `https://oauth.meitu.com/oauth2/authorize?&appid=${appid}&response_type=code&redirect_uri=${redirectUrlStr}&state=test&scope=user_info`;
                console.log("authUrl", authUrl);

                // 每个 seesion 对应一个 server
                let server = setupServer("", token);
                // 新会话创建新 transport
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sessionId) => {
                        console.log(`New session created: ${sessionId}`);
                        // 缓存以服用
                        transports[sessionId] = transport;
                    },
                    // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
                    // locally, make sure to set:
                    // enableDnsRebindingProtection: true,
                    // allowedHosts: ['127.0.0.1'],
                });
                // 监听 session 关闭事件，删除缓存
                transport.onclose = () => {
                    console.log(`Session closed: ${transport.sessionId}`);
                    if (transport.sessionId) {
                        delete transports[transport.sessionId];
                    }
                };
                await server.connect(transport);
                console.log('Server connected to transport');
            } else {
                console.warn('Invalid request: No valid session ID provided or not an initialize request');
                console.warn('Session ID:', sessionId);
                console.warn('Is initialize request:', isInitializeRequest(req.body));
                console.warn('Request body:', JSON.stringify(req.body));
                
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided',
                    },
                    id: null,
                });
                return;
            }
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            console.error('Error handling POST /mcp request:', error);
            console.error('Request headers:', req.headers);
            console.error('Request body:', req.body);
            
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32001,
                        message: 'Internal Server Error: ' + (error instanceof Error ? error.message : 'Unknown error'),
                    },
                    id: null,
                });
            }
        }
    });

    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
        try {
            console.log(`Received ${req.method} /mcp request with session`);
            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            if (!sessionId || !transports[sessionId]) {
                console.warn('Invalid or missing session ID for GET/DELETE request');
                console.warn('Session ID provided:', sessionId);
                console.warn('Available sessions:', Object.keys(transports));
                
                res.status(400).send('Invalid or missing session ID');
                return;
            }
            console.log(`Handling ${req.method} request for session: ${sessionId}`);
            const transport = transports[sessionId];
            await transport.handleRequest(req, res);
        } catch (error) {
            console.error('Error handling session request:', error);
            console.error('Request headers:', req.headers);
            console.error('Request method:', req.method);
            
            if (!res.headersSent) {
                res.status(500).send('Internal Server Error');
            }
        }
    };
    
    app.get('/mcp', handleSessionRequest);
    app.delete('/mcp', handleSessionRequest);
    
    app.get('/cookie', async (req: express.Request, res: express.Response) => {
        try {
            let auth_info = req.cookies?.milu_auth_info;
            res.send(`ok milu_auth_info=${auth_info}`)
        } catch (error) {
            console.error('Error handling GET /cookie request:', error);
            res.status(500).send('Internal Server Error');
        }
    });
    
    app.get('/callback', async (req: express.Request, res: express.Response) => {
        try {
            if (!secret || secret.length == 0) {
                console.warn('Secret is empty in callback handler');
                res.send("secret is empty");
                return;
            }
            let code = req.query.code as string;
            let state = req.query.state as string;
            let auth = JSON.stringify({
                code: code,
                state: state,
                auth: "",
            });
            // 授权后缓存 cookie，有效期 7 天
            res.cookie('milu_auth_info', auth, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: true,
                secure: true,
            });
            res.send(`ok code=${code} state=${state}`)
        } catch (error) {
            console.error('Error handling GET /callback request:', error);
            console.error('Query parameters:', req.query);
            
            if (!res.headersSent) {
                res.status(500).send('Internal Server Error');
            }
        }
    });
    
    app.listen(port, () => {
        console.log(`MTDeviceMCP MCP Server appVer=${config.APP_VERSION}, Streamable HTTP Server listening on port ${port}`);
    }).on('error', (error) => {
        console.error(`Failed to start server on port ${port}:`, error);
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