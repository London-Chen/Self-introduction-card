const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const API_KEY = process.env.DEEPSEEK_API_KEY;
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 全局错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

// 创建处理请求的函数
const handleRequest = async (req, res) => {
    try {
        console.log(`收到请求: ${req.method} ${req.url}`);

        // 添加CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // 处理OPTIONS请求
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // 处理静态文件
        if (req.method === 'GET') {
            // 规范化URL路径，移除查询参数
            let urlPath = req.url.split('?')[0];
            
            // 处理根路径请求
            if (urlPath === '/') {
                urlPath = '/index.html';
            }
            
            // 构建完整的文件路径
            const filePath = path.join(process.cwd(), urlPath.replace(/^\/+/, ''));
            
            console.log(`尝试读取文件: ${filePath}`);
            const extname = path.extname(filePath);
            const contentType = MIME_TYPES[extname] || 'application/octet-stream';

            try {
                const content = await fs.promises.readFile(filePath);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
                console.log(`成功发送文件: ${filePath}`);
            } catch (error) {
                console.error(`文件读取错误: ${filePath}`, error);
                res.writeHead(404);
                res.end('File not found');
            }
            return;
        }

        // 处理API请求
        if (req.method === 'POST' && req.url === '/generate') {
            console.log('开始处理生成请求');
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    console.log('收到的请求数据:', body);
                    const { intro } = JSON.parse(body);
                    
                    // 构建提示词
                    const prompt = `你是一个专业的自我介绍卡片设计师。请根据以下内容生成一个HTML卡片。要求：

1. 严格限制宽度为375px
2. 使用现代简约的设计风格
3. 合理使用颜色和布局突出重要信息
4. 只返回HTML代码，不要包含任何解释或描述
5. 确保代码可以直接在浏览器中运行
6. 所有样式都必须内联在HTML中
7. 必须使用Font Awesome图标库来增强视觉效果（已在页面中引入：<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">）
8. 为不同的信息部分添加适当的图标（如个人信息、专业技能、经历等）
9. 使用现代化的色彩方案和视觉层次
10. 精心设计卡片的每个细节，包括标题、内容、分隔线和间距

自我介绍内容：
${intro}

请直接返回HTML代码，不要有任何其他文字说明。生成的代码将直接嵌入到网页中显示。`;

                    console.log('开始调用DeepSeek API');
                    // 调用DeepSeek API
                    const response = await new Promise((resolve, reject) => {
                        const options = {
                            hostname: 'api.deepseek.com',
                            path: '/chat/completions',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${API_KEY}`
                            }
                        };

                        console.log('API请求配置:', options);
                        const req = https.request(options, (res) => {
                            console.log('API响应状态码:', res.statusCode);
                            let data = '';
                            res.on('data', chunk => {
                                data += chunk;
                                console.log('收到API数据块:', chunk.toString());
                            });
                            res.on('end', () => {
                                try {
                                    console.log('API完整响应:', data);
                                    const parsedData = JSON.parse(data);
                                    if (res.statusCode !== 200) {
                                        reject(new Error(parsedData.error?.message || 'API请求失败'));
                                    } else {
                                        resolve(parsedData);
                                    }
                                } catch (error) {
                                    console.error('解析API响应失败:', error);
                                    reject(new Error('解析API响应失败'));
                                }
                            });
                        });

                        req.on('error', (error) => {
                            console.error('API请求错误:', error);
                            reject(new Error(`API请求错误: ${error.message}`));
                        });

                        req.setTimeout(120000, () => {
                            console.log('API请求超时');
                            req.destroy();
                            reject(new Error('请求超时'));
                        });

                        const requestData = {
                            model: 'deepseek-chat',
                            messages: [
                                {
                                    role: 'system',
                                    content: '你是一个专业的自我介绍卡片设计师，只返回HTML代码，不要包含任何解释或描述。确保使用Font Awesome图标库增强视觉效果。'
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            stream: false
                        };

                        console.log('发送API请求数据:', JSON.stringify(requestData));
                        req.write(JSON.stringify(requestData));
                        req.end();
                    });

                    console.log('API调用成功，开始处理响应');
                    // 从API响应中提取HTML代码，移除所有非HTML内容
                    let html = response.choices[0].message.content;
                    
                    // 只保留HTML代码部分
                    html = html.replace(/```html\n?|\n?```/g, ''); // 移除代码块标记
                    html = html.replace(/.*?<!DOCTYPE html>/is, '<!DOCTYPE html>'); // 移除开头的描述文字
                    html = html.replace(/<\/html>[\s\S]*/i, '</html>'); // 移除结尾的描述文字
                    
                    console.log('处理后的HTML:', html);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ html }));
                    console.log('响应已发送');
                } catch (error) {
                    console.error('处理请求时发生错误:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        // 对于其他请求，返回404
        res.writeHead(404);
        res.end('Not found');
    } catch (error) {
        console.error('服务器错误:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
};

// 为本地开发创建HTTP服务器
if (process.env.NODE_ENV !== 'production') {
    const server = http.createServer(handleRequest);

    server.on('error', (error) => {
        console.error('服务器错误:', error);
        if (error.code === 'EADDRINUSE') {
            console.error(`端口 ${PORT} 已被占用`);
        }
    });

    server.listen(PORT, () => {
        console.log(`服务器启动成功，监听端口 ${PORT}`);
        console.log(`请访问 http://localhost:${PORT}/`);
    });
}

// 导出函数，供Vercel使用
module.exports = handleRequest; 