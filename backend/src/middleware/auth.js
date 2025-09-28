const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user can access resource
const canAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      // Admin can access everything
      if (userRole === 'admin') {
        return next();
      }

      // Check resource-specific access
      switch (resourceType) {
        case 'profile':
          if (userRole === 'student' && id === userId.toString()) {
            return next();
          }
          if (['mentor', 'placement_cell', 'recruiter'].includes(userRole)) {
            return next();
          }
          break;

        case 'application':
          // Students can access their own applications
          // Mentors, placement cell, and recruiters can access applications they're involved with
          if (userRole === 'student') {
            const Application = require('../models/Application');
            const application = await Application.findById(id);
            if (application && application.studentId.toString() === userId.toString()) {
              return next();
            }
          }
          if (['mentor', 'placement_cell', 'recruiter'].includes(userRole)) {
            return next();
          }
          break;

        case 'job':
          // Everyone can view published jobs
          if (req.method === 'GET') {
            return next();
          }
          // Only placement cell and recruiters can modify jobs
          if (['placement_cell', 'recruiter', 'admin'].includes(userRole)) {
            return next();
          }
          break;

        default:
          return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied to this resource'
      });
    } catch (error) {
      console.error('Access control error:', error);
      res.status(500).json({
        success: false,
        message: 'Access control error'
      });
    }
  };
};

// Log user actions for audit
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    try {
      // Store original response methods
      const originalSend = res.send;
      const originalJson = res.json;

      // Override response methods to capture response
      res.send = function(data) {
        // Log the action
        AuditLog.createLog({
          entityType,
          entityId: req.params.id || req.body.id || req.user._id,
          action,
          actor: req.user._id,
          actorRole: req.user.role,
          changes: {
            before: req.body.before || {},
            after: req.body.after || {}
          },
          metadata: {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            requestId: req.headers['x-request-id'],
            additionalData: {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode
            }
          }
        }).catch(err => console.error('Audit log error:', err));

        // Call original method
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        // Log the action
        AuditLog.createLog({
          entityType,
          entityId: req.params.id || req.body.id || req.user._id,
          action,
          actor: req.user._id,
          actorRole: req.user.role,
          changes: {
            before: req.body.before || {},
            after: req.body.after || {}
          },
          metadata: {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            requestId: req.headers['x-request-id'],
            additionalData: {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode
            }
          }
        }).catch(err => console.error('Audit log error:', err));

        // Call original method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Audit log middleware error:', error);
      next();
    }
  };
};

// Check if user is the owner of a resource
const isOwner = (resourceType) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      switch (resourceType) {
        case 'profile':
          const Profile = require('../models/Profile');
          const profile = await Profile.findById(id);
          if (profile && profile.userId.toString() === userId.toString()) {
            return next();
          }
          break;

        case 'application':
          const Application = require('../models/Application');
          const application = await Application.findById(id);
          if (application && application.studentId.toString() === userId.toString()) {
            return next();
          }
          break;

        default:
          return next();
      }

      return res.status(403).json({
        success: false,
        message: 'You can only access your own resources'
      });
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Ownership verification error'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  authorize,
  canAccess,
  auditLog,
  isOwner
};
