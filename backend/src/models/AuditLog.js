const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['user', 'profile', 'job', 'application', 'certificate', 'system']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'create',
      'read',
      'update',
      'delete',
      'login',
      'logout',
      'approve',
      'reject',
      'shortlist',
      'interview',
      'offer',
      'certificate_issued',
      'data_export',
      'data_delete',
      'consent_given',
      'consent_withdrawn'
    ]
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Actor user ID is required']
  },
  actorRole: {
    type: String,
    required: [true, 'Actor role is required'],
    enum: ['student', 'mentor', 'placement_cell', 'recruiter', 'admin', 'system']
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  metadata: {
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    sessionId: {
      type: String,
      trim: true
    },
    requestId: {
      type: String,
      trim: true
    },
    additionalData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  isCompliant: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: false // We use custom timestamp field
});

// Indexes for better query performance
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ isCompliant: 1 });

// Compound indexes for common queries
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Create audit log entry
auditLogSchema.statics.createLog = function(data) {
  const auditLog = new this({
    entityType: data.entityType,
    entityId: data.entityId,
    action: data.action,
    actor: data.actor,
    actorRole: data.actorRole,
    changes: data.changes || {},
    metadata: data.metadata || {},
    severity: data.severity || 'low',
    isCompliant: data.isCompliant !== false
  });
  
  return auditLog.save();
};

// Get audit trail for an entity
auditLogSchema.statics.getAuditTrail = function(entityType, entityId, options = {}) {
  const query = { entityType, entityId };
  
  if (options.startDate) {
    query.timestamp = { ...query.timestamp, $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: options.endDate };
  }
  
  if (options.actions && options.actions.length > 0) {
    query.action = { $in: options.actions };
  }
  
  if (options.actors && options.actors.length > 0) {
    query.actor = { $in: options.actors };
  }
  
  return this.find(query)
    .populate('actor', 'name email role')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Get user activity summary
auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const query = { actor: userId };
  
  if (options.startDate) {
    query.timestamp = { ...query.timestamp, $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: options.endDate };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 50);
};

// Get compliance report
auditLogSchema.statics.getComplianceReport = function(options = {}) {
  const query = {};
  
  if (options.startDate) {
    query.timestamp = { ...query.timestamp, $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: options.endDate };
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          entityType: '$entityType',
          action: '$action',
          severity: '$severity'
        },
        count: { $sum: 1 },
        compliant: { $sum: { $cond: ['$isCompliant', 1, 0] } },
        nonCompliant: { $sum: { $cond: ['$isCompliant', 0, 1] } }
      }
    },
    {
      $sort: { '_id.entityType': 1, '_id.action': 1 }
    }
  ]);
};

// Get data access logs for GDPR compliance
auditLogSchema.statics.getDataAccessLogs = function(entityType, entityId, userId) {
  return this.find({
    entityType,
    entityId,
    $or: [
      { actor: userId },
      { 'metadata.additionalData.accessedBy': userId }
    ],
    action: { $in: ['read', 'data_export', 'data_delete'] }
  })
  .populate('actor', 'name email role')
  .sort({ timestamp: -1 });
};

// Clean up old audit logs (for data retention)
auditLogSchema.statics.cleanupOldLogs = function(retentionDays = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  return this.deleteMany({
    timestamp: { $lt: cutoffDate },
    severity: { $in: ['low', 'medium'] }
  });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

