// 导入必要的模块
const https = require('https');
require('dotenv').config();

// 从环境变量获取API密钥
const API_KEY = process.env.DEEPSEEK_API_KEY;

// 处理请求的函数
module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只处理POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '请求方法不允许' });
    }

    try {
        const { intro } = req.body;
        
        if (!intro) {
            return res.status(400).json({ error: '缺少自我介绍内容' });
        }

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

            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => {
                    data += chunk;
                });
                apiRes.on('end', () => {
                    try {
                        const parsedData = JSON.parse(data);
                        if (apiRes.statusCode !== 200) {
                            reject(new Error(parsedData.error?.message || 'API请求失败'));
                        } else {
                            resolve(parsedData);
                        }
                    } catch (error) {
                        reject(new Error('解析API响应失败'));
                    }
                });
            });

            apiReq.on('error', (error) => {
                reject(new Error(`API请求错误: ${error.message}`));
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

            apiReq.write(JSON.stringify(requestData));
            apiReq.end();
        });

        // 从API响应中提取HTML代码，移除所有非HTML内容
        let html = response.choices[0].message.content;
        
        // 只保留HTML代码部分
        html = html.replace(/```html\n?|\n?```/g, ''); // 移除代码块标记
        html = html.replace(/.*?<!DOCTYPE html>/is, '<!DOCTYPE html>'); // 移除开头的描述文字
        html = html.replace(/<\/html>[\s\S]*/i, '</html>'); // 移除结尾的描述文字
        
        return res.status(200).json({ html });
    } catch (error) {
        console.error('处理请求时发生错误:', error);
        return res.status(500).json({ error: error.message });
    }
}; 