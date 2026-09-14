const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAccessToken(admin) {
  return jwt.sign(
    { sub: admin.id, role: admin.role, email: admin.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

// Refresh tokens are random opaque strings stored (hashed) in the DB,
// not JWTs — this lets us revoke them individually.
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiry() {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '30', 10);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// Shorter, URL-friendly random token — used for the per-order document-upload token
// that gets shown to the customer once, at order placement.
function generateUploadToken() {
  return crypto.randomBytes(24).toString('hex');
}

function uploadTokenExpiry() {
  // Give the customer 60 days to upload documents against an order
  return new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
  generateUploadToken,
  uploadTokenExpiry,
};
