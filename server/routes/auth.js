import express from 'express';
import { handleLogin, handleLogout, handleValidateSession, getSessionInfo } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /auth/login
 * Authenticate admin user with username/password
 */
router.post('/login', handleLogin);

/**
 * POST /auth/logout
 * Logout admin user and invalidate session
 */
router.post('/logout', handleLogout);

/**
 * GET /auth/validate
 * Validate current session token
 */
router.get('/validate', handleValidateSession);

/**
 * POST /auth/validate
 * Validate session token (also accept POST for flexibility)
 */
router.post('/validate', handleValidateSession);

/**
 * GET /auth/info
 * Get authentication service information (for debugging)
 */
router.get('/info', (req, res) => {
  try {
    const info = getSessionInfo();
    res.json({
      authSystemActive: info.authSystemActive,
      sessionStore: {
        activeSessions: info.activeSessions,
        timeout: info.timeout
      },
      environment: process.env.NODE_ENV || 'development',
      hasAdminCredentials: !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD)
    });
  } catch (error) {
    console.error('❌ Auth info error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication info service error',
        code: 'AUTH_INFO_ERROR'
      },
      message: 'Authentication info service error'
    });
  }
});

export default router;
