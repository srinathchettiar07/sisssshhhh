const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPosting',
    required: [true, 'Job ID is required']
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: [true, 'Application ID is required']
  },
  certificateId: {
    type: String,
    unique: true,
    required: [true, 'Certificate ID is required']
  },
  supervisorFeedback: {
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supervisor ID is required']
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      required: [true, 'Supervisor rating is required']
    },
    feedback: {
      type: String,
      required: [true, 'Supervisor feedback is required'],
      trim: true,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters']
    },
    skillsDemonstrated: [{
      type: String,
      trim: true
    }],
    achievements: [{
      type: String,
      trim: true
    }],
    areasForImprovement: [{
      type: String,
      trim: true
    }],
    wouldRecommend: {
      type: Boolean,
      required: [true, 'Recommendation status is required']
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  pdfUrl: {
    type: String,
    trim: true
  },
  signatureHash: {
    type: String,
    required: [true, 'Signature hash is required']
  },
  verificationCode: {
    type: String,
    unique: true,
    required: [true, 'Verification code is required']
  },
  qrCodeUrl: {
    type: String,
    trim: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Validity end date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
certificateSchema.index({ studentId: 1 });
certificateSchema.index({ jobId: 1 });
certificateSchema.index({ applicationId: 1 });
certificateSchema.index({ certificateId: 1 });
certificateSchema.index({ verificationCode: 1 });
certificateSchema.index({ issuedAt: -1 });
certificateSchema.index({ validUntil: 1 });
certificateSchema.index({ isActive: 1 });

// Generate certificate ID before saving
certificateSchema.pre('save', function(next) {
  if (!this.certificateId) {
    this.certificateId = `CAP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  if (!this.verificationCode) {
    this.verificationCode = crypto.randomBytes(16).toString('hex').toUpperCase();
  }
  
  if (!this.signatureHash) {
    this.signatureHash = this.generateSignatureHash();
  }
  
  next();
});

// Generate signature hash for tamper detection
certificateSchema.methods.generateSignatureHash = function() {
  const data = {
    certificateId: this.certificateId,
    studentId: this.studentId.toString(),
    jobId: this.jobId.toString(),
    issuedAt: this.issuedAt.toISOString(),
    supervisorId: this.supervisorFeedback.supervisorId.toString(),
    rating: this.supervisorFeedback.rating
  };
  
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

// Verify certificate integrity
certificateSchema.methods.verifyIntegrity = function() {
  const currentHash = this.generateSignatureHash();
  return currentHash === this.signatureHash;
};

// Get certificate verification URL
certificateSchema.methods.getVerificationUrl = function() {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/verify-certificate/${this.verificationCode}`;
};

// Get certificate public data (for verification)
certificateSchema.methods.getPublicData = function() {
  return {
    certificateId: this.certificateId,
    issuedAt: this.issuedAt,
    validUntil: this.validUntil,
    isActive: this.isActive,
    verificationCode: this.verificationCode,
    signatureHash: this.signatureHash,
    integrityVerified: this.verifyIntegrity()
  };
};

// Check if certificate is valid
certificateSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         this.issuedAt <= now && 
         this.validUntil >= now &&
         this.verifyIntegrity();
};

// Get certificate summary
certificateSchema.methods.getSummary = function() {
  return {
    id: this._id,
    certificateId: this.certificateId,
    studentId: this.studentId,
    jobId: this.jobId,
    rating: this.supervisorFeedback.rating,
    issuedAt: this.issuedAt,
    validUntil: this.validUntil,
    isActive: this.isActive,
    verificationUrl: this.getVerificationUrl()
  };
};

// Generate QR code data
certificateSchema.methods.getQRCodeData = function() {
  return {
    certificateId: this.certificateId,
    verificationCode: this.verificationCode,
    verificationUrl: this.getVerificationUrl(),
    issuedAt: this.issuedAt.toISOString()
  };
};

module.exports = mongoose.model('Certificate', certificateSchema);

