const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/helpers');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
} = require('../utils/tokens');

const REFRESH_COOKIE_NAME = 'seva_refresh_token';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: (parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '30', 10)) * 24 * 60 * 60 * 1000,
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  if (admin.status === 'SUSPENDED') {
    return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact the Superadmin.' });
  }

  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const accessToken = signAccessToken(admin);
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: hashToken(refreshToken),
      adminId: admin.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  await prisma.activityLog.create({
    data: { adminId: admin.id, action: 'LOGIN', meta: { ip: req.ip } },
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
  res.json({
    success: true,
    accessToken,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No refresh token provided.' });
  }

  const hashed = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    return res.status(401).json({ success: false, message: 'Refresh token invalid or expired. Please log in again.' });
  }

  const admin = await prisma.admin.findUnique({ where: { id: stored.adminId } });
  if (!admin || admin.status === 'SUSPENDED') {
    return res.status(403).json({ success: false, message: 'Account unavailable.' });
  }

  // Rotate refresh token
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  const newRefreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { token: hashToken(newRefreshToken), adminId: admin.id, expiresAt: refreshTokenExpiry() },
  });

  const accessToken = signAccessToken(admin);
  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);
  res.json({ success: true, accessToken });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { token: hashToken(token) },
      data: { revoked: true },
    });
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out.' });
});

const me = asyncHandler(async (req, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
  });
  res.json({ success: true, admin });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const admin = await prisma.admin.update({
    where: { id: req.admin.id },
    data: { name, phone },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  res.json({ success: true, admin });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });

  const match = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!match) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

  // Revoke all existing refresh tokens on password change for security
  await prisma.refreshToken.updateMany({ where: { adminId: admin.id }, data: { revoked: true } });

  res.json({ success: true, message: 'Password updated. Please log in again.' });
});

module.exports = { login, refresh, logout, me, updateProfile, changePassword, REFRESH_COOKIE_NAME, cookieOptions };
