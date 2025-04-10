// 简单的API服务状态检查
module.exports = (req, res) => {
  res.status(200).json({
    status: 'online',
    message: '自我介绍卡片生成器API服务正常运行'
  });
}; 