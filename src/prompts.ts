// MCP SDK
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// 三方工具
import { z } from "zod";

export class Prompt {

    private server: McpServer;

    constructor(server: McpServer) {
        this.server = server;
    }

    setup(): void {
        // prompts
        this.server.prompt("translate", "进行翻译的prompt", {
            content: z.string()
        }, ({ content }) => ({
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `请将下面的话语翻译成中文：\n\n${content}`
                }
            }]
        }));
    }
}