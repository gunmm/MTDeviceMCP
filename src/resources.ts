// MCP SDK
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
// 三方工具

export class Resource {

    private server: McpServer;

    constructor(server: McpServer) {
        this.server = server;
    }

    setup(): void {
        // resources
        this.server.resource("echo", new ResourceTemplate("echo://{message}", { list: undefined }),
            {
                title: "Echo Resource",
                description: "Echoes back messages as resources"
            },
            async (uri, { message }) => ({
                contents: [{
                    uri: uri.href,
                    text: `Resource echo: ${message}`
                }]
            }));
    }
}