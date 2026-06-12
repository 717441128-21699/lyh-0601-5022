function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
}

function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${random}${Date.now().toString().slice(-4)}`;
}

function successResponse(res, data = null, message = '操作成功') {
  res.json({
    code: 200,
    message,
    data
  });
}

function errorResponse(res, message = '操作失败', code = 400) {
  res.status(code).json({
    code,
    message
  });
}

function paginate(page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  return {
    limit: pageSize,
    offset,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
}

function parseJsonField(value, defaultValue = null) {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch (e) {
    return defaultValue;
  }
}

module.exports = {
  calculateDistance,
  generateOrderNo,
  successResponse,
  errorResponse,
  paginate,
  parseJsonField
};
