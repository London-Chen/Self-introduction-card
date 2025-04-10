const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const API_KEY = 'sk-a223ea0b00534836ba56e59d31d2d71a';
const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// 全局错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

const server = http.createServer((req, res) => {
    console.log(`收到请求: ${req.method} ${req.url}`);

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    // 解析URL
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = parsedUrl.pathname;

    // 处理生成请求
    if (pathname === '/generate' && req.method === 'POST') {
        handleGenerateRequest(req, res);
        return;
    }

    // 处理根路径
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // 规范化路径，移除前导斜杠
    const normalizedPath = pathname.replace(/^\/+/, '');
    const filePath = path.join(__dirname, normalizedPath);

    // 获取文件扩展名
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // 尝试读取文件
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在
                res.statusCode = 404;
                res.end('404 Not Found');
            } else {
                // 服务器错误
                res.statusCode = 500;
                res.end(`服务器错误: ${err.code}`);
            }
            return;
        }

        // 发送文件内容
        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.end(data);
    });
});

// 处理生成请求的函数
async function handleGenerateRequest(req, res) {
    try {
        console.log('开始处理生成请求');
        let body = '';
        
        // 收集请求数据
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        // 处理完整请求
        req.on('end', async () => {
            try {
                console.log('收到的请求数据:', body);
                const data = JSON.parse(body);
                const intro = data.intro;
                
                if (!intro) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: '缺少自我介绍内容' }));
                    return;
                }
                
                // 调用API生成卡片
                console.log('开始调用DeepSeek API');
                const result = await callDeepSeekAPI(intro);
                
                // 返回生成的HTML
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ html: result }));
            } catch (error) {
                console.error('处理请求时出错:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `生成失败: ${error.message}` }));
            }
        });
    } catch (error) {
        console.error('处理生成请求时出错:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `服务器错误: ${error.message}` }));
    }
}

// 调用DeepSeek API
async function callDeepSeekAPI(intro) {
    return new Promise((resolve, reject) => {
        const API_KEY = 'sk-a223ea0b00534836ba56e59d31d2d71a';
        
        const requestData = JSON.stringify({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system", 
                    content: "你是一个专业的自我介绍卡片设计师，只返回HTML代码，不要包含任何解释或描述。确保使用Font Awesome图标库增强视觉效果。生成的卡片应该简洁、现代、美观，只包含关键信息。不要包含任何多余的注释或说明。"
                },
                {
                    role: "user", 
                    content: `根据以下自我介绍内容，生成一个简洁的个人介绍卡片，使用HTML和内联CSS: ${intro}。设计要求：现代简约风格，渐变背景，合理使用Font Awesome图标，突出显示姓名和核心信息。只返回纯HTML代码，不要有任何其他内容。`
                }
            ]
        });
        
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
        console.log('发送API请求数据:', requestData);
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    console.log('API响应状态码:', res.statusCode);
                    if (res.statusCode !== 200) {
                        console.error('API响应错误:', responseData);
                        reject(new Error(`API请求失败，状态码: ${res.statusCode}`));
                        return;
                    }
                    
                    const jsonResponse = JSON.parse(responseData);
                    if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
                        resolve(jsonResponse.choices[0].message.content);
                    } else {
                        console.error('API响应格式不正确:', jsonResponse);
                        reject(new Error('API响应格式不正确'));
                    }
                } catch (error) {
                    console.error('处理API响应时出错:', error, '原始响应:', responseData);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('API请求出错:', error);
            reject(error);
        });
        
        req.write(requestData);
        req.end();
    });
}

// 支持Vercel部署
if (process.env.VERCEL) {
    // 导出Vercel serverless函数处理器
    module.exports = (req, res) => {
        if (req.url === '/generate' || req.url.startsWith('/generate?')) {
            handleGenerateRequest(req, res);
        } else {
            res.statusCode = 404;
            res.end('Not Found');
        }
    };
} else {
    // 本地开发环境启动服务器
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`服务器启动成功，监听端口 ${PORT}`);
        console.log(`请访问 http://localhost:${PORT}/`);
    });
} 