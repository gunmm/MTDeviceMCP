// MCP SDK
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// 依赖的工具
import { z } from "zod";
import moment from 'moment';
import { randomUUID } from "node:crypto";
import axios from "axios";
import * as cheerio from "cheerio";

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

        // this.server.tool(
        //     "getAvailableTestDevices",
        //     "查询指定日期、地区和平台的可预约测试设备列表，或者查询指定用户已预约的设备。这是查询用户预约信息的关键工具，当用户询问是否有预约设备时必须使用。当用户询问'我明天有预约手机吗'时，应该先获取当前用户名和明天的日期，然后调用此工具并传入username和date参数来查询用户的预约情况。此工具的调用是完成查询任务的必要步骤，不能省略。如果要依赖其他方法获取参数，需要逐步执行。",
        //     {
        //         date: z.string().describe("查询日期，格式为 YYYY-MM-DD，例如 2025-09-21，可以通过getCurrentTime方法获取"),
        //         area: z.string().optional().describe("地区筛选条件，如'北京致真21层'、'PIX北京'等。不传则查询所有地区"),
        //         platform: z.string().optional().describe("平台筛选条件，传入'安卓'、'iOS'。不传则查询所有平台"),
        //         username: z.string().optional().describe("用户名，如果提供此参数，则查询该用户已预约的设备，可以通过getCurrentUserName方法获取。当需要取消预约或查询用户预约情况时，必须提供此参数。这是完成预约查询任务的必要参数。"),
        //         // firm: z.string().optional().describe("厂商筛选条件，如'小米'、'华为'、'苹果'等。不传则查询所有厂商"),
        //         // resolution: z.string().optional().describe("分辨率筛选条件。不传则不按分辨率筛选"),
        //         // user_name: z.string().optional().describe("使用者姓名筛选条件。不传则不按使用者筛选"),
        //         // system: z.string().optional().describe("系统版本筛选条件。不传则不按系统版本筛选"),
        //         // device: z.string().optional().describe("设备型号筛选条件。不传则不按设备型号筛选"),
        //     },
        //     async ({ date, area, platform, username }) => {
        //         if (this.token.length == 0) {
        //             return {
        //                 content: [
        //                     {
        //                         type: "text",
        //                         text: "请先配置授权码",
        //                     },
        //                 ],
        //             };
        //         }

        //         // 验证日期格式
        //         const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        //         if (!dateRegex.test(date)) {
        //             return {
        //                 content: [
        //                     {
        //                     type: "text",
        //                     text: "日期格式错误，请使用 YYYY-MM-DD 格式，例如 2025-09-21",
        //                     },
        //                 ],
        //             };
        //         }

        //         // 构建请求参数
        //         const params = new URLSearchParams();
        //         params.append('date', date);
                
        //         // 处理地区参数
        //         if (area && area.trim() !== '') {
        //             // 根据地区名称映射到对应的ID
        //             const areaMap: {[key: string]: string} = {
        //                 '深圳9层': '6',
        //                 '北京致真21层': '7',
        //                 '18层公共': '22',
        //                 '15层公共': '23',
        //                 '18层秀秀wink设计室': '24',
        //                 '15层美颜': '25',
        //                 '9层PIX': '26',
        //                 '14层': '27',
        //                 '17层': '28',
        //                 '19层': '29',
        //                 '20层': '30',
        //                 '16层': '31',
        //                 '上海': '32',
        //                 '18层自动化': '33',
        //                 '9层PIX自动化': '34',
        //                 '13层': '36',
        //                 '18层': '37',
        //                 'PIX深圳': '40',
        //                 'PIX北京': '41',
        //                 '18层海外': '42',
        //                 '北京商业化机架': '43',
        //                 '北京致真大厦': '44',
        //                 '15层自动化': '45',
        //                 '9层机架': '46',
        //                 '15层': '47',
        //                 '17层-锋荣-linux': '48',
        //                 '10层': '49',
        //                 '台湾': '50',
        //                 '韩国': '51',
        //                 '深圳25层': '52'
        //             };
                    
        //             const trimmedArea = area.trim();
        //             if (areaMap[trimmedArea]) {
        //                 params.append('area', areaMap[trimmedArea]);

        //             } else {
        //                 // 检查是否包含这些关键词

        //                 if (trimmedArea.includes('深圳')) {
        //                     params.append('area', '6');
        //                 } else if (trimmedArea.includes('北京')) {
        //                     params.append('area', '7');
        //                 } else if (trimmedArea.includes('18层')) {
        //                     params.append('area', '22');
        //                 } else if (trimmedArea.includes('15层')) {
        //                     params.append('area', '23');
        //                 } else {
        //                     // 如果没有映射关系，直接使用原始值
        //                     params.append('area', trimmedArea);
        //                 }
        //             }
        //         }
                
        //         params.append('use_admin', '2'); // 管理者
        //         params.append('not_apply', '0');
        //         params.append('page', '1');
        //         params.append('pagesize', '100'); // 获取所有数据
                
        //         // 添加各种筛选条件到 advance_form
        //         let advanceForm: any = {};
                
        //         // 平台筛选条件 (2=安卓, 3=iOS)
        //         if (platform && platform.trim() !== '') {
        //             // 标准化平台参数
        //             let normalizedPlatform = platform.trim();
        //             if (normalizedPlatform.toLowerCase() === 'ios' || normalizedPlatform === 'iOS') {
        //                 normalizedPlatform = '3';
        //             } else if (normalizedPlatform.toLowerCase() === 'android' || normalizedPlatform === '安卓') {
        //                 normalizedPlatform = '2';
        //             }
        //             params.append('platform', normalizedPlatform);
        //         }
                
        //         // 如果提供了username，则查询该用户已预约的设备
        //         if (username) {
        //             params.append('user_name', username);
        //         }

        //         try {
        //             // 发送请求获取测试设备列表
        //             const response = await fetch('http://device.order.meitu.com/api/device/list', {
        //                 method: 'POST',
        //                 headers: {
        //                     'X-Requested-With': 'XMLHttpRequest',
        //                     'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        //                     'Cookie': `PHPSESSID=${this.token}`,
        //                 },
        //                 body: params,
        //             });
        //             console.log("---*** 请求设备列表 params", params.toString());

        //             const contentType = response.headers.get("Content-Type");

        //             const responseText = await response.text();
        //             console.log("请求结束");

        //             // 检查响应是否为HTML错误页面
        //             if (responseText.startsWith('<!DOCTYPE')) {
        //                 return {
        //                     content: [
        //                         {
        //                             type: "text",
        //                             text: `获取测试设备列表失败: 服务器返回了错误页面，请检查请求参数或Cookie是否有效`,
        //                         },
        //                     ],
        //                 };
        //             }

        //             if (!response.ok) {
        //                 throw new Error(`HTTP error! status: ${response.status}`);
        //             }

        //             const result = JSON.parse(responseText);
                    
        //             // 根据查询类型处理设备数据
        //             if (result.data && Array.isArray(result.data)) {
        //                 if (!username) {
        //                     // 如果没有提供username，则过滤掉已被完全预约的设备
        //                     result.data = result.data.filter((device: any) => {
        //                         // 检查设备是否已被预约
        //                         const record = device.record;
        //                         if (!record) return true; // 如果没有record信息，则认为可预约
                                
        //                         // 检查早、中、晚三个时段是否都被预约
        //                         const isMorningBooked = record.morning?.record_id && record.morning.record_id !== '';
        //                         const isAfternoonBooked = record.afternoon?.record_id && record.afternoon.record_id !== '';
        //                         const isNightBooked = record.night?.record_id && record.night.record_id !== '';
                                
        //                         // 如果所有时段都被预约，则过滤掉该设备
        //                         return !(isMorningBooked && isAfternoonBooked && isNightBooked);
        //                     });
        //                 }
        //                 // 如果提供了username，查询的是用户已预约设备，不过滤直接返回
                        
        //                 // 更新总数
        //                 result.total = result.data.length;
        //             }
                    
        //             return {
        //                 content: [
        //                     {
        //                         type: "text",
        //                         text: JSON.stringify(result),
        //                     },
        //                 ],
        //             };
        //         } catch (error) {
        //             console.error("获取测试设备列表失败:", error);
        //             let errorMessage = "未知错误";
        //             if (error instanceof Error) {
        //                 errorMessage = error.message;
        //             } else if (typeof error === "string") {
        //                 errorMessage = error;
        //             }
        //             return {
        //                 content: [
        //                     {
        //                         type: "text",
        //                         text: `获取测试设备列表失败: ${errorMessage}`,
        //                     },
        //                 ],
        //             };
        //         }
        //     },
        // );

        // 通用的参数处理函数
        const buildCommonParams = (date: string, area: string | undefined, platform: string | undefined) => {
            // 验证日期格式
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                throw new Error("日期格式错误，请使用 YYYY-MM-DD 格式，例如 2025-09-21");
            }

            // 构建请求参数
            const params = new URLSearchParams();
            params.append('date', date);
            
            // 处理地区参数
            if (area && area.trim() !== '') {
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
                } else {
                     // 处理包含多个地区的查询
                    if (trimmedArea.includes('北京')) {
                        // 北京相关地区
                        const beijingAreas = ['7', '43', '44', '41']; // 北京致真21层、北京商业化机架、北京致真大厦、PIX北京
                        params.append('area', beijingAreas.join(','));
                    } else if (trimmedArea.includes('厦门')) {
                        // 厦门相关地区（根据映射表中可能的地区）
                        const xiamenAreas = ['22', '23']; 
                        params.append('area', xiamenAreas.join(','));
                    } else if (trimmedArea.includes('深圳')) {
                        // 深圳相关地区
                        const shenzhenAreas = ['6', '40', '52']; // 深圳9层、PIX深圳、深圳25层
                        params.append('area', shenzhenAreas.join(','));
                    } else if (areaMap[trimmedArea]) {
                        params.append('area', areaMap[trimmedArea]);
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
            
            // 添加平台筛选条件 (2=安卓, 3=iOS)
            if (platform && platform.trim() !== '') {
                // 标准化平台参数
                let normalizedPlatform = platform.trim();
                if (normalizedPlatform.toLowerCase() === 'ios' || normalizedPlatform === 'iOS') {
                    normalizedPlatform = '3';
                } else if (normalizedPlatform.toLowerCase() === 'android' || normalizedPlatform === '安卓') {
                    normalizedPlatform = '2';
                }
                params.append('platform', normalizedPlatform);
            }
            
            return params;
        };

        // 通用的设备列表请求函数
        const fetchDeviceList = async (params: URLSearchParams, token: string) => {
            try {
                // 发送请求获取测试设备列表
                const response = await fetch('http://device.order.meitu.com/api/device/list', {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Cookie': `PHPSESSID=${token}`,
                    },
                    body: params,
                });
                console.log("---*** 请求设备列表 params", params.toString());

                const responseText = await response.text();
                console.log("请求结束");

                // 检查响应是否为HTML错误页面
                if (responseText.startsWith('<!DOCTYPE')) {
                    throw new Error(`服务器返回了错误页面，请检查请求参数或Cookie是否有效`);
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = JSON.parse(responseText);
                return result;
            } catch (error) {
                console.error("获取测试设备列表失败:", error);
                throw error;
            }
        };

        // 获取用户已预约设备列表
        this.server.tool(
            "getUserReservedDevices",
            "获取指定用户已预约的设备列表。当用户询问自己预约了哪些设备时使用此工具。必须提供用户名参数。如果要依赖其他方法获取参数，必须逐步执行。此工具的调用是完成查询任务的必要步骤，不能省略。该方法返回的结果字段中record代表可以预约，cancle代表可以取消预约。",
            {
                date: z.string().describe("查询日期，格式为 YYYY-MM-DD，例如 2025-09-21，可以通过getCurrentTime方法获取"),
                username: z.string().describe("用户名，需要查询该用户已预约的设备，可以通过getCurrentUserName方法获取"),
                area: z.string().optional().describe("地区筛选条件，如'北京致真21层'、'PIX北京'等。不传则查询所有地区"),
                platform: z.string().optional().describe("平台筛选条件，传入'安卓'、'iOS'。不传则查询所有平台"),
            },
            async ({ date, username, area, platform }) => {
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

                try {
                    const params = buildCommonParams(date, area, platform);
                    params.append('user_name', username); // 查询指定用户的预约
                    
                    const result = await fetchDeviceList(params, this.token);
                    
                    // 对于用户预约查询，不过滤直接返回
                    if (result.data && Array.isArray(result.data)) {
                        // 只返回有预约记录的设备
                        result.data = result.data.filter((device: any) => {
                            const record = device.record;
                            if (!record) return false;
                            
                            // 检查是否有任意时段被该用户预约
                            const isMorningBooked = record.morning?.user_name && record.morning.user_name.includes(username);
                            const isAfternoonBooked = record.afternoon?.user_name && record.afternoon.user_name.includes(username);
                            const isNightBooked = record.night?.user_name && record.night.user_name.includes(username);
                            
                            return isMorningBooked || isAfternoonBooked || isNightBooked;
                        });
                        
                        // 更新总数
                        result.total = result.data.length;
                    }
                    
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                } catch (error) {
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
                                text: `获取用户预约设备列表失败: ${errorMessage}`,
                            },
                        ],
                    };
                }
            },
        );

        // 获取可预约设备列表（过滤掉已完全预约的设备）
        this.server.tool(
            "getAvailableDevices",
            "获取指定日期可预约的测试设备列表。此工具会过滤掉已被完全预约的设备，只返回还有空闲时段的设备。当用户想要预约设备时使用此工具。如果要依赖其他方法获取参数，必须逐步执行。此工具的调用是完成查询任务的必要步骤，不能省略。",
            {
                date: z.string().describe("查询日期，格式为 YYYY-MM-DD，例如 2025-09-21，可以通过getCurrentTime方法获取"),
                area: z.string().optional().describe("地区筛选条件，如'北京致真21层'、'PIX北京'等。不传则查询所有地区"),
                platform: z.string().optional().describe("平台筛选条件，传入'安卓'、'iOS'。不传则查询所有平台"),
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

                try {
                    const params = buildCommonParams(date, area, platform);
                    const result = await fetchDeviceList(params, this.token);
                    
                    // 过滤掉已被完全预约的设备
                    if (result.data && Array.isArray(result.data)) {
                        result.data = result.data.filter((device: any) => {
                            // 检查设备是否已被预约
                            const record = device.record;
                            if (!record) return true; // 如果没有record信息，则认为可预约
                            
                            // 检查早、中、晚三个时段是否都被预约
                            const isMorningBooked = record.morning?.record_id && record.morning.record_id !== '';
                            const isAfternoonBooked = record.afternoon?.record_id && record.afternoon.record_id !== '';
                            const isNightBooked = record.night?.record_id && record.night.record_id !== '';
                            
                            // 如果所有时段都被预约，则过滤掉该设备
                            return !(isMorningBooked && isAfternoonBooked && isNightBooked);
                        });
                        
                        // 更新总数
                        result.total = result.data.length;
                    }
                    
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                } catch (error) {
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
                                text: `获取可预约设备列表失败: ${errorMessage}`,
                            },
                        ],
                    };
                }
            },
        );

        // 获取所有设备列表（不过滤）
        this.server.tool(
            "getAllDevices",
            "获取指定日期的所有测试设备列表，包括已被预约和可预约的设备。此工具不过滤任何设备，返回完整的设备列表。如果要依赖其他方法获取参数，必须逐步执行。此工具的调用是完成查询任务的必要步骤，不能省略。",
            {
                date: z.string().describe("查询日期，格式为 YYYY-MM-DD，例如 2025-09-21，可以通过getCurrentTime方法获取"),
                area: z.string().optional().describe("地区筛选条件，如'北京致真21层'、'PIX北京'等。不传则查询所有地区"),
                platform: z.string().optional().describe("平台筛选条件，传入'安卓'、'iOS'。不传则查询所有平台"),
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

                try {
                    const params = buildCommonParams(date, area, platform);
                    const result = await fetchDeviceList(params, this.token);
                    
                    // 不过滤直接返回所有设备
                    if (result.data && Array.isArray(result.data)) {
                        // 更新总数
                        result.total = result.data.length;
                    }
                    
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                } catch (error) {
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
                                text: `获取所有设备列表失败: ${errorMessage}`,
                            },
                        ],
                    };
                }
            },
        );

        this.server.tool(
            "reserveTestDevice",
            "预约测试设备。这个方法一次只能预约一个设备，如果要预约多个设备，必须多次调用这个方法。如果要依赖其他方法获取参数，必须逐步执行。时间和用户名不可以一起获取，必须一步一步获取",
            {
                deviceId: z.string().describe("要预约的设备ID"),
                date: z.string().describe("预约日期，格式为 YYYY-MM-DD，可以通过getCurrentTime方法获取"),
                userId: z.string().describe("用户ID，可以通过getUserIdByName工具获取"),
            },
            async ({ deviceId, date, userId }) => {

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

                try {
                    // 构建请求参数
                    const form = new URLSearchParams();
                    form.append("device_id", deviceId);
                    form.append("user_id", userId);
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

                    console.log("---*** 预约机器 form", form.toString());


                    // 发送预约请求
                    const response = await fetch("http://device.order.meitu.com/api/device/appointment", {
                        method: "POST",
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json, text/javascript, */*; q=0.01',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Cookie': `PHPSESSID=${this.token}`,
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

        // 添加取消预约设备的工具方法
        this.server.tool(
            "cancelReservation",
            "取消已预约的设备。当用户需要取消设备预约时使用此工具。此方法必须针对上午、下午和晚上三个时段分别执行一次，每个时段必须单独调用一次该方法。通常需要先调用getUserReservedDevices工具并传入username参数来获取设备预约信息，然后从返回结果中提取recordId和searchUserName参数。此工具的调用是完成取消预约任务的必要步骤，不能省略。时间和用户名不可以一起获取，必须一步一步获取。如果要依赖其他方法获取参数，必须逐步执行。",
            {
                recordId: z.string().describe("预约记录ID，可以从getUserReservedDevices查询结果中获得，record字段下的morning、afternoon、night三个子字段中的record_id就是对应的预约记录ID。需要分别获取每个时段的record_id进行取消操作"),
                searchUserName: z.string().describe("搜索用户名，格式为'部门-姓名'，可以从getUserReservedDevices查询结果中获得，对应record字段下的morning、afternoon、night三个子字段中的user_name字段。注意这个参数不是简单的用户名，而是包含部门信息的完整用户名"),
            },
            async ({ recordId, searchUserName }) => {
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

                try {
                    // 构建请求参数
                    const form = new URLSearchParams();
                    form.append("record_id", recordId);

                    console.log("---*** 取消预约设备 form", form.toString());

                    // 发送取消预约请求
                    const response = await fetch("http://device.order.meitu.com/api/device/return", {
                        method: "POST",
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json, text/javascript, */*; q=0.01',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Cookie': `PHPSESSID=${this.token}`,
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
                                    text: `取消预约失败: 服务器返回了错误页面，请检查请求参数或Cookie是否有效。请求参数: ${form.toString()}`,
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
                    console.error("取消预约失败:", error);
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
                                text: `取消预约失败: ${errorMessage}`,
                            },
                        ],
                    };
                }
            },
        );

        // 添加获取当前时间的工具方法
        this.server.tool(
            "getCurrentTime",
            "获取当前时间，格式为 YYYY-MM-DD HH:mm:ss，用于辅助其他需要时间参数的工具。获取时间后，必须继续执行后续操作，例如查询预约信息等。获取时间本身不是最终目标，而是为了完成更复杂的任务。如果要依赖其他方法获取参数，必须逐步执行。这个方法拿到结果后需要先处理才能继续执行其他方法。该方法和getCurrentUserName方法必须分两步执行",
            {
                format: z.string().optional().describe("时间格式，支持 YYYY-MM-DD、YYYY-MM-DD HH:mm:ss 等，不传默认为 YYYY-MM-DD"),
            },
            async ({ format }) => {
                // 如果没有指定格式，默认使用 YYYY-MM-DD
                let timeFormat = format || 'YYYY-MM-DD HH:mm:ss';
                
                // 特殊处理一些常用格式
                switch(timeFormat) {
                    case 'date':
                        timeFormat = 'YYYY-MM-DD';
                        break;
                    case 'datetime':
                        timeFormat = 'YYYY-MM-DD HH:mm:ss';
                        break;
                }
                
                console.log("---*** getCurrentTime");
                const currentTime = moment().format(timeFormat);
                return {
                    content: [
                        {
                            type: "text",
                            text: currentTime,
                        },
                    ],
                };
            },
        );

        let pageCache: {
            userMap: Map<string, string>;
            currentUser: {
                id: string;
                name: string;
                email: string;
            } | null;
        } | null = null;

        let token: string = this.token;

        // 统一从页面获取并解析
        const loadPageInfo = async () => {
            if (pageCache) return pageCache;

            if (token.length === 0) {
                return {
                    userMap: new Map<string, string>(),
                    currentUser: null,
                };
            }

            const res = await axios.get("http://device.order.meitu.com/index", {
                headers: {
                    Cookie: `PHPSESSID=${token}`,
                },
            });

            const html = res.data;
            const $ = cheerio.load(html);

            // 解析用户映射
            const map = new Map<string, string>();
            $("el-option").each((_, el) => {
                const label = $(el).attr("label") || "";
                const value = $(el).attr("value") || "";
                if (label && value) {
                    const match = label.match(/-([^-(]+)\(/);
                    if (match) {
                        const name = match[1].trim();
                        map.set(name, value);
                    }
                }
            });

            // 解析当前用户信息
            const userMatch = html.match(
                /current_user_id:\s*"(\d+)",\s*current_user_name:\s*"([^"]+)",\s*current_user_email:\s*"([^"]+)"/
            );

            let currentUser = null;
            if (userMatch) {
                currentUser = {
                    id: userMatch[1],
                    name: userMatch[2],
                    email: userMatch[3],
                };
            }

            pageCache = {
                userMap: map,
                currentUser,
            };

            return pageCache;
        };

        // 核心方法：通过名字拿用户ID
        const getUserIdByName = async (name: string): Promise<string | null> => {
            const { userMap } = await loadPageInfo();
            console.log("---***name", name);
            console.log("---***get", userMap.get(name));
            return userMap.get(name) || null;
        };
    
        this.server.tool(
            "getUserIdByName",
            "根据姓名获取用户ID。获取用户ID后，通常需要根据用户ID查询相关数据，如查询预约信息等，需要传递给后续方法。如果要依赖其他方法获取参数，必须逐步执行。",
            {
                name: z.string().describe("要获取的ID的用户名，可以通过getCurrentUserName方法获取"),
            },
            async ({ name }) => {
                console.log("---*** 451 name", name);

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

                const id = await getUserIdByName(name);
                return {
                    content: [{ type: "text", text: id ? `用户ID: ${id}` : "未找到用户" }],
                };
            }
        );

        // 新增方法：获取当前用户名
        const getCurrentUserName = async (): Promise<string | null> => {
            try {
                const { currentUser } = await loadPageInfo();
                return currentUser ? currentUser.name : null;
            } catch (error) {
                console.error("获取当前用户名失败:", error);
                return null;
            }
        };

        // 注册到 MCP 工具
        this.server.tool(
            "getCurrentUserName",
            "获取当前登录用户名，这是一个辅助工具，主要用于为其他需要用户名参数的工具提供用户名信息。获取用户名后，必须继续执行后续操作，例如查询该用户的预约信息等。获取用户名本身不是最终目标，而是为了完成更复杂的任务。如果要依赖其他方法获取参数，必须逐步执行。这个方法拿到结果后需要先处理才能继续执行其他方法。该方法和getCurrentTime方法必须两步执行",
            {
                format: z.string().optional().describe("输出格式，支持 'name'（默认）或 'full'（完整格式：当前用户名: name）"),
            },
            async ({ format }) => {
                if (this.token.length == 0) {
                    return {
                        content: [{ type: "text", text: "请先配置授权码" }],
                        isError: true,
                        message: "未配置授权码"
                    };
                }

                try {
                    const name = await getCurrentUserName();
                    if (name) {
                        // 根据format参数决定输出格式
                        let outputText = name;
                        if (format === 'full') {
                            outputText = `当前用户名: ${name}`;
                        }
                        
                        return {
                            content: [{ type: "text", text: outputText }],
                        };
                    } else {
                        return {
                            content: [{ type: "text", text: "" }],
                            isError: true,
                            message: "未找到当前用户"
                        };
                    }
                } catch (error) {
                    console.error("获取当前用户名工具执行失败:", error);
                    let errorMessage = "未知错误";
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    }
                    return {
                        content: [{ type: "text", text: "" }],
                        isError: true,
                        message: `获取当前用户名失败: ${errorMessage}`
                    };
                }
            }
        );
    }
}