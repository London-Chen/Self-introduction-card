// 导入必要的模块
const https = require('https');

// 处理请求的函数
module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只处理POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '请求方法不允许' });
    }

    try {
        // 解析请求体
        const { intro } = req.body;
        
        if (!intro) {
            return res.status(400).json({ error: '缺少自我介绍内容' });
        }

        console.log(`处理介绍请求`);

        // 简短的自我介绍使用模板，长文本尝试调用API
        if (intro.length < 120) {
            console.log('自我介绍较短，使用本地模板');
            const html = generateTemplateCard(intro);
            return res.status(200).json({ html });
        }

        // 尝试使用API生成，如果失败则使用模板
        try {
            // 从环境变量获取API密钥
            const API_KEY = process.env.DEEPSEEK_API_KEY;
            
            if (!API_KEY) {
                throw new Error('API密钥未设置');
            }
            
            console.log('开始调用DeepSeek API');
            
            // 使用包含超时的Promise.race调用DeepSeek API
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API请求超时')), 10000); // 10秒超时
            });
            
            const apiPromise = callDeepSeekAPI(API_KEY, intro);
            
            // 等待先完成的Promise
            const response = await Promise.race([apiPromise, timeoutPromise]);

            // 从API响应中提取HTML代码，移除所有非HTML内容
            let html = response.choices[0].message.content;
            
            // 简化HTML处理
            html = html.replace(/```html\n?|\n?```/g, ''); // 移除代码块标记
            
            console.log('成功处理API响应');
            return res.status(200).json({ html });
        } catch (error) {
            console.log('使用备用模板:', error.message);
            // 使用备用模板生成卡片
            const html = generateTemplateCard(intro);
            return res.status(200).json({ html });
        }
    } catch (error) {
        console.error('处理错误:', error.message);
        return res.status(500).json({ error: error.message || '服务器内部错误' });
    }
};

// 生成模板卡片函数
function generateTemplateCard(intro) {
    // 简单处理文本
    const lines = intro.split('\n').filter(line => line.trim() !== '');
    
    // 提取姓名（假设第一行包含姓名）
    const name = lines[0]?.split('，')[0]?.split('：')[0] || '个人介绍';
    
    // 生成简单的技能标签（从文本中提取可能的技能关键词）
    const skills = extractSkills(intro);
    
    // 生成HTML
    return `
    <div style="width: 375px; border-radius: 16px; overflow: hidden; font-family: 'Noto Sans SC', sans-serif; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); background: linear-gradient(to bottom, #ffffff, #f8f9fa);">
        <!-- 顶部区域 -->
        <div style="background: linear-gradient(135deg, #4a6cf7, #2541b2); color: white; padding: 20px; text-align: center;">
            <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-user-circle" style="font-size: 50px;"></i>
            </div>
            <h2 style="margin: 0; font-size: 22px; font-weight: 700;">${name}</h2>
            <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">个人简介卡片</p>
        </div>
        
        <!-- 内容区域 -->
        <div style="padding: 20px;">
            <!-- 自我介绍部分 -->
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <i class="fas fa-quote-left" style="color: #4a6cf7; font-size: 18px; margin-right: 8px;"></i>
                    <h3 style="margin: 0; font-size: 16px; color: #333;">个人简介</h3>
                </div>
                <div style="background-color: #f8f9fa; border-radius: 12px; padding: 15px; font-size: 14px; line-height: 1.6; color: #444;">
                    ${intro.substring(0, 300)}${intro.length > 300 ? '...' : ''}
                </div>
            </div>
            
            <!-- 技能标签部分 -->
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <i class="fas fa-lightbulb" style="color: #4a6cf7; font-size: 18px; margin-right: 8px;"></i>
                    <h3 style="margin: 0; font-size: 16px; color: #333;">技能标签</h3>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${skills.map(skill => `
                        <span style="background-color: #e8f0fe; color: #4a6cf7; padding: 5px 10px; border-radius: 30px; font-size: 12px;">
                            ${skill}
                        </span>
                    `).join('')}
                </div>
            </div>
            
            <!-- 底部装饰 -->
            <div style="display: flex; justify-content: center; margin-top: 20px; color: #aaa;">
                <span style="font-size: 12px;">自我介绍卡片生成器 | 长沙智谷志愿者</span>
            </div>
        </div>
    </div>
    `;
}

// 提取可能的技能关键词
function extractSkills(text) {
    const skillKeywords = [
        "编程", "开发", "设计", "沟通", "管理", "组织", "领导", "分析", 
        "解决问题", "创新", "学习", "团队协作", "HTML", "CSS", "JavaScript", 
        "Python", "Java", "C++", "PHP", "数据库", "UI", "UX", "前端", "后端", 
        "全栈", "项目管理", "营销", "销售", "研究", "教学", "演讲", "写作",
        "人工智能", "机器学习", "数据分析", "云计算", "网络安全"
    ];
    
    const found = [];
    skillKeywords.forEach(keyword => {
        if (text.includes(keyword) && found.length < 10) {
            found.push(keyword);
        }
    });
    
    // 如果找不到足够的技能，添加一些基本技能
    const defaultSkills = ["沟通能力", "团队协作", "解决问题", "创新思维", "学习能力"];
    while (found.length < 5) {
        const skill = defaultSkills[found.length % defaultSkills.length];
        if (!found.includes(skill)) {
            found.push(skill);
        }
    }
    
    return found;
}

// 调用DeepSeek API的辅助函数
async function callDeepSeekAPI(apiKey, intro) {
    // 构建精简的提示词
    const prompt = `生成自我介绍HTML卡片:
1. 宽度375px
2. 简约设计风格
3. 内联样式
4. 使用Font Awesome图标
5. 只返回HTML代码

自我介绍:
${intro.substring(0, 500)}`;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.deepseek.com',
            path: '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 8000 // 8秒超时
        };

        const apiReq = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                try {
                    if (!data) {
                        return reject(new Error('API返回空响应'));
                    }
                    
                    const parsedData = JSON.parse(data);
                    
                    if (apiRes.statusCode !== 200) {
                        return reject(new Error(parsedData.error?.message || `API请求失败: ${apiRes.statusCode}`));
                    } else {
                        resolve(parsedData);
                    }
                } catch (error) {
                    reject(new Error('解析API响应失败: ' + error.message));
                }
            });
        });

        apiReq.on('error', (error) => {
            reject(new Error(`API请求错误: ${error.message}`));
        });
        
        apiReq.on('timeout', () => {
            apiReq.destroy();
            reject(new Error('API请求超时'));
        });

        const requestData = {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: '你是自我介绍卡片设计师，只返回HTML代码，不要解释。使用Font Awesome图标和简洁的设计。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            stream: false,
            temperature: 0.1, // 降低创造性，提高一致性
            max_tokens: 1000  // 限制响应长度
        };

        try {
            apiReq.write(JSON.stringify(requestData));
            apiReq.end();
        } catch (error) {
            reject(new Error(`发送API请求失败: ${error.message}`));
        }
    });
} 