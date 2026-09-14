// Wraps an async route handler so rejected promises reach Express's error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Generates a human-friendly, sortable order tracking number, e.g. SP-2026-000123
function buildOrderNumber(sequence) {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(6, '0');
  return `SP-${year}-${padded}`;
}

function paginationParams(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = { asyncHandler, buildOrderNumber, paginationParams, paginatedResponse };
