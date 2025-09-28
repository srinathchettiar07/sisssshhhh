const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
  event: {
    type: String,
    required: [true, 'Event type is required'],
    enum: [
      'applied',
      'mentor_approval_pending',
      'mentor_approved',
      'mentor_rejected',
      'shortlisted',
      'interview_scheduled',
      'interview_completed',
      'offer_made',
      'offer_accepted',
      'offer_rejected',
      'rejected',
      'withdrawn'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Actor user ID is required']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPosting',
    required: [true, 'Job ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  resumeSnapshotUrl: {
    type: String,
    trim: true
  },
  coverLetterSnapshot: {
    type: String,
    trim: true,
    maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: [
      'applied',
      'mentor_approval_pending',
      'mentor_approved',
      'mentor_rejected',
      'shortlisted',
      'interview_scheduled',
      'interview_completed',
      'offer_made',
      'offer_accepted',
      'offer_rejected',
      'rejected',
      'withdrawn'
    ],
    default: 'applied'
  },
  fitScore: {
    type: Number,
    min: [0, 'Fit score cannot be negative'],
    max: [100, 'Fit score cannot exceed 100'],
    default: 0
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  timeline: [timelineEventSchema],
  mentorApproval: {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Mentor comment cannot exceed 500 characters']
    },
    approvedAt: {
      type: Date
    }
  },
  interviewDetails: {
    scheduledAt: {
      type: Date
    },
    duration: {
      type: Number, // in minutes
      default: 60
    },
    location: {
      type: String,
      trim: true
    },
    meetingLink: {
      type: String,
      trim: true
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Interview feedback cannot exceed 1000 characters']
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    }
  },
  offerDetails: {
    offeredAt: {
      type: Date
    },
    offerLetterUrl: {
      type: String,
      trim: true
    },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    terms: {
      type: String,
      trim: true
    }
  },
  aiInsights: {
    skillMatch: {
      type: Number,
      min: [0, 'Skill match cannot be negative'],
      max: [100, 'Skill match cannot exceed 100']
    },
    experienceMatch: {
      type: Number,
      min: [0, 'Experience match cannot be negative'],
      max: [100, 'Experience match cannot exceed 100']
    },
    recommendation: {
      type: String,
      trim: true,
      maxlength: [500, 'AI recommendation cannot exceed 500 characters']
    },
    strengths: [{
      type: String,
      trim: true
    }],
    improvements: [{
      type: String,
      trim: true
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ studentId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ 'mentorApproval.status': 1 });
applicationSchema.index({ 'interviewDetails.scheduledAt': 1 });
applicationSchema.index({ isActive: 1 });

// Compound indexes
applicationSchema.index({ studentId: 1, status: 1 });
applicationSchema.index({ jobId: 1, status: 1 });

// Add timeline event
applicationSchema.methods.addTimelineEvent = function(event, actorId, comment = '', metadata = {}) {
  this.timeline.push({
    event,
    actor: actorId,
    comment,
    metadata,
    timestamp: new Date()
  });
  
  // Update status if it's a status-changing event
  if (['mentor_approved', 'mentor_rejected', 'shortlisted', 'interview_scheduled', 
       'interview_completed', 'offer_made', 'offer_accepted', 'offer_rejected', 
       'rejected', 'withdrawn'].includes(event)) {
    this.status = event;
  }
  
  return this.save();
};

// Check if application is in a final state
applicationSchema.methods.isFinalState = function() {
  const finalStates = ['offer_accepted', 'offer_rejected', 'rejected', 'withdrawn'];
  return finalStates.includes(this.status);
};

// Get application summary for display
applicationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    jobId: this.jobId,
    studentId: this.studentId,
    status: this.status,
    fitScore: this.fitScore,
    appliedAt: this.appliedAt,
    mentorApprovalStatus: this.mentorApproval.status,
    interviewScheduled: this.interviewDetails.scheduledAt,
    hasOffer: this.offerDetails.offeredAt ? true : false
  };
};

// Calculate days since application
applicationSchema.methods.getDaysSinceApplication = function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.appliedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Application', applicationSchema);

