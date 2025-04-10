// 将此文件用作API路由通用助手（确保在Vercel上能找到正确的环境变量）
const dotenv = require('dotenv');

// 尝试加载环境变量
try {
    dotenv.config();
    console.log('环境变量加载成功');
} catch (error) {
    console.error('加载环境变量失败:', error);
}

// 检查关键环境变量
console.log('DEEPSEEK_API_KEY存在:', !!process.env.DEEPSEEK_API_KEY);

module.exports = {
    // 这里可以添加其他通用函数
}; 