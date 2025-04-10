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

        console.log(`处理介绍请求: ${intro.substring(0, 30)}...`);

        // 尝试使用API生成，如果失败则使用模板
        try {
            // 从环境变量获取API密钥
            const API_KEY = process.env.DEEPSEEK_API_KEY;
            
            console.log('API密钥是否存在:', !!API_KEY);
            
            if (API_KEY) {
                console.log('开始调用DeepSeek API');
                
                // 使用包含超时的Promise.race调用DeepSeek API
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('API请求超时')), 20000); // 20秒超时
                });
                
                const apiPromise = callDeepSeekAPI(API_KEY, intro);
                
                // 等待先完成的Promise
                const response = await Promise.race([apiPromise, timeoutPromise]);
                
                console.log('获取到DeepSeek API响应');

                // 从API响应中提取HTML代码，移除所有非HTML内容
                let html = response.choices[0].message.content;
                
                // 只保留HTML代码部分
                html = html.replace(/```html\n?|\n?```/g, ''); // 移除代码块标记
                html = html.replace(/.*?<!DOCTYPE html>/is, '<!DOCTYPE html>'); // 移除开头的描述文字
                html = html.replace(/<\/html>[\s\S]*/i, '</html>'); // 移除结尾的描述文字
                
                console.log('成功处理HTML内容');
                return res.status(200).json({ html });
            } else {
                throw new Error('API密钥未设置');
            }
        } catch (error) {
            console.log('API生成失败，使用备用模板:', error.message);
            // 使用备用模板生成卡片
            const html = generateTemplateCard(intro);
            return res.status(200).json({ html });
        }
    } catch (error) {
        console.error('处理请求时发生错误:', error.message);
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

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.deepseek.com',
            path: '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 15000 // 15秒超时
        };

        console.log('准备发送HTTP请求');
        const apiReq = https.request(options, (apiRes) => {
            console.log('收到API响应状态码:', apiRes.statusCode);
            
            let data = '';
            apiRes.on('data', chunk => {
                data += chunk;
                console.log('收到数据块大小:', chunk.length);
            });
            
            apiRes.on('end', () => {
                try {
                    if (!data) {
                        return reject(new Error('API返回空响应'));
                    }
                    
                    console.log('API响应数据长度:', data.length);
                    const parsedData = JSON.parse(data);
                    
                    if (apiRes.statusCode !== 200) {
                        console.error('API错误:', parsedData);
                        return reject(new Error(parsedData.error?.message || `API请求失败: ${apiRes.statusCode}`));
                    } else {
                        resolve(parsedData);
                    }
                } catch (error) {
                    console.error('解析API响应失败:', error.message, '数据片段:', data.substring(0, 100));
                    reject(new Error('解析API响应失败: ' + error.message));
                }
            });
        });

        apiReq.on('error', (error) => {
            console.error('API请求网络错误:', error.message);
            reject(new Error(`API请求错误: ${error.message}`));
        });
        
        apiReq.on('timeout', () => {
            console.error('API请求超时');
            apiReq.destroy();
            reject(new Error('API请求超时'));
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

        try {
            apiReq.write(JSON.stringify(requestData));
            apiReq.end();
            console.log('API请求发送完成');
        } catch (error) {
            console.error('发送API请求时出错:', error.message);
            reject(new Error(`发送API请求失败: ${error.message}`));
        }
    });
} 