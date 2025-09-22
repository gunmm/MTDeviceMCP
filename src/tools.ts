// MCP SDK
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// 依赖的工具
import { z } from "zod";
import moment from 'moment';
import { randomUUID } from "node:crypto";
// OA 相关
// 环境变量
let mode = process.env.MILU_MCP_RUN_MODE ?? "stdio";
let pwd = process.cwd();
console.log(`current working directory: ${pwd}`);


// 封装工具实现类
export class Tools {

    private server: McpServer;
    private token: string;
    private cookie: string;

    constructor(server: McpServer, cookie: string, token: string) {
        this.server = server;
        this.cookie = cookie;
        this.token = token;
        let code = randomUUID();
        console.log("Tools init", code);
    }

    setup(): void {

        if (process.env.DEBUG == "true" && mode == "stdio") {
            this.server.tool(
                "getDebugInfo",
                "获取调试信息",
                {

                },
                async ({ }) => {
                    let txt = `pwd=${pwd},env=${JSON.stringify(process.env)}`
                    return {
                        content: [
                            {
                                type: "text",
                                text: txt,
                            },
                        ],
                    };
                },
            );
        }  

        this.server.tool(
            "getCurrentTime",
            "获取当前时间，如 2025-06-25T18:01:18+08:00",
            {

            },
            async ({ }) => {
                let txt = moment().format();
                return {
                    content: [
                        {
                            type: "text",
                            text: txt,
                        },
                    ],
                    isError: false
                };
            },
        );

        this.server.tool(
            "getAvailableTestDevices",
            "查询指定日期、地区和平台的可预约测试设备列表。例如：查询北京地区iOS平台的可用设备，查询深圳地区安卓平台的可用设备等。",
            {
                date: z.string().describe("查询日期，格式为 YYYY-MM-DD，例如 2025-09-21"),
                area: z.string().optional().describe("地区筛选条件，如'北京致真21层'、'PIX北京'等。不传则查询所有地区"),
                platform: z.string().optional().describe("平台筛选条件，传入'安卓'、'iOS'。不传则查询所有平台"),
                // firm: z.string().optional().describe("厂商筛选条件，如'小米'、'华为'、'苹果'等。不传则查询所有厂商"),
                // resolution: z.string().optional().describe("分辨率筛选条件。不传则不按分辨率筛选"),
                // user_name: z.string().optional().describe("使用者姓名筛选条件。不传则不按使用者筛选"),
                // system: z.string().optional().describe("系统版本筛选条件。不传则不按系统版本筛选"),
                // device: z.string().optional().describe("设备型号筛选条件。不传则不按设备型号筛选"),
            },
            async ({ date, area, platform }) => {
                if (this.token.length == 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "请先配置授权码",
                            },
                        ],
                    };
                }

                // 验证日期格式
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(date)) {
                    return {
                        content: [
                            {
                            type: "text",
                            text: "日期格式错误，请使用 YYYY-MM-DD 格式，例如 2025-09-21",
                            },
                        ],
                    };
                }

                // 构建请求参数
                const params = new URLSearchParams();
                params.append('date', date);
                
                // 处理地区参数
                if (area && area.trim() !== '') {
                    console.log("---*** 527", area);
                    // 根据地区名称映射到对应的ID
                    const areaMap: {[key: string]: string} = {
                        '深圳9层': '6',
                        '北京致真21层': '7',
                        '18层公共': '22',
                        '15层公共': '23',
                        '18层秀秀wink设计室': '24',
                        '15层美颜': '25',
                        '9层PIX': '26',
                        '14层': '27',
                        '17层': '28',
                        '19层': '29',
                        '20层': '30',
                        '16层': '31',
                        '上海': '32',
                        '18层自动化': '33',
                        '9层PIX自动化': '34',
                        '13层': '36',
                        '18层': '37',
                        'PIX深圳': '40',
                        'PIX北京': '41',
                        '18层海外': '42',
                        '北京商业化机架': '43',
                        '北京致真大厦': '44',
                        '15层自动化': '45',
                        '9层机架': '46',
                        '15层': '47',
                        '17层-锋荣-linux': '48',
                        '10层': '49',
                        '台湾': '50',
                        '韩国': '51',
                        '深圳25层': '52'
                    };
                    
                    const trimmedArea = area.trim();
                    if (areaMap[trimmedArea]) {
                        params.append('area', areaMap[trimmedArea]);
                        console.log("---*** 540", areaMap[trimmedArea]);

                    } else {
                        // 检查是否包含这些关键词
                         console.log("---*** 544", area);

                        if (trimmedArea.includes('深圳')) {
                            params.append('area', '6');
                        } else if (trimmedArea.includes('北京')) {
                            params.append('area', '7');
                        } else if (trimmedArea.includes('18层')) {
                            params.append('area', '22');
                        } else if (trimmedArea.includes('15层')) {
                            params.append('area', '23');
                        } else {
                            // 如果没有映射关系，直接使用原始值
                            params.append('area', trimmedArea);
                        }
                    }
                }
                
                params.append('use_admin', '2'); // 管理者
                params.append('not_apply', '0');
                params.append('page', '1');
                params.append('pagesize', '100'); // 获取所有数据
                
                // 添加各种筛选条件到 advance_form
                let advanceForm: any = {};
                
                // 平台筛选条件 (2=安卓, 3=iOS)
                if (platform && platform.trim() !== '') {
                    // 标准化平台参数
                    let normalizedPlatform = platform.trim();
                    if (normalizedPlatform.toLowerCase() === 'ios' || normalizedPlatform === 'iOS') {
                        normalizedPlatform = '3';
                    } else if (normalizedPlatform.toLowerCase() === 'android' || normalizedPlatform === '安卓') {
                        normalizedPlatform = '2';
                    }
                    advanceForm.platform = normalizedPlatform;
                }
                

                try {
                    // 发送请求获取测试设备列表
                    const response = await fetch('http://device.order.meitu.com/api/device/list', {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Cookie': 'PHPSESSID=nl0d4v0ni7t6o0phb6pgj4e781',
                        },
                        body: params,
                    });
                    console.log("请求设备列表 params", params.toString());

                    const contentType = response.headers.get("Content-Type");
                    console.log("服务器返回类型:", contentType);

                    const responseText = await response.text();
                    console.log("返回原始内容：", responseText);

                    // 检查响应是否为HTML错误页面
                    if (responseText.startsWith('<!DOCTYPE')) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `获取测试设备列表失败: 服务器返回了错误页面，请检查请求参数或Cookie是否有效`,
                                },
                            ],
                        };
                    }

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = JSON.parse(responseText);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                } catch (error) {
                    console.error("获取测试设备列表失败:", error);
                    let errorMessage = "未知错误";
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else if (typeof error === "string") {
                        errorMessage = error;
                    }
                    return {
                        content: [
                            {
                                type: "text",
                                text: `获取测试设备列表失败: ${errorMessage}`,
                            },
                        ],
                    };
                }
            },
        );

        this.server.tool(
            "reserveTestDevice",
            "预约测试设备",
            {
                deviceId: z.string().describe("要预约的设备ID"),
                date: z.string().describe("预约日期，格式为 YYYY-MM-DD"),
            },
            async ({ deviceId, date }) => {
                // 验证日期格式
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(date)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "日期格式错误，请使用 YYYY-MM-DD 格式，例如 2025-09-21",
                            },
                        ],
                    };
                }

                try {
                    // 构建请求参数
                    const form = new URLSearchParams();
                    form.append("device_id", deviceId);
                    form.append("user_id", "1226");
                    form.append("on_rack", "0");
                    form.append("reason", "");
                    form.append("type", "");

                    
                     // 默认预约上午和下午
                    form.append(`morning[use_date]`, date);
                    form.append(`morning[return_date]`, date);
                    form.append(`afternoon[use_date]`, date);
                    form.append(`afternoon[return_date]`, date);
                    form.append(`night[use_date]`, date);
                    form.append(`night[return_date]`, date);

                    console.log("预约机器 form", form.toString());


                    // 发送预约请求
                    const response = await fetch("http://device.order.meitu.com/api/device/appointment", {
                        method: "POST",
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json, text/javascript, */*; q=0.01',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Cookie': 'PHPSESSID=nl0d4v0ni7t6o0phb6pgj4e781',
                        },
                        body: form.toString(),
                    });

                    const responseText = await response.text();
                    
                    // 检查响应是否为HTML错误页面
                    if (responseText.startsWith('<!DOCTYPE')) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `预约设备失败: 服务器返回了错误页面，请检查请求参数或Cookie是否有效。请求参数: ${form.toString()}`,
                                },
                            ],
                        };
                    }

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = JSON.parse(responseText);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                } catch (error) {
                    console.error("预约设备失败:", error);
                    let errorMessage = "未知错误";
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else if (typeof error === "string") {
                        errorMessage = error;
                    }
                    return {
                        content: [
                            {
                                type: "text",
                                text: `预约设备失败: ${errorMessage}`,
                            },
                        ],
                    };
                }
            },
        );
    }
}