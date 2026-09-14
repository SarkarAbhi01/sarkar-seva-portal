const { verifyAccessToken } = require('../utils/tokens');
const prisma = require('../config/prisma');

/**
 * Verifies the access token from the Authorization header and attaches
 * the authenticated admin (id, role, email, status) to req.admin.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const payload = verifyAccessToken(token);

    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Account no longer exists.' });
    }
    if (admin.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, message: 'Account is suspended.' });
    }

    req.admin = { id: admin.id, role: admin.role, email: admin.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/**
 * Restricts a route to one or more roles, e.g. requireRole('SUPERADMIN')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
