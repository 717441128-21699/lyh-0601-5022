function errorHandler(err, req, res, next) {
  console.error('错误:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
  res.status(statusCode).json({
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

function notFound(req, res, next) {
  res.status(404).json({
    code: 404,
    message: '接口不存在'
  });
}

module.exports = {
  errorHandler,
  notFound
};
