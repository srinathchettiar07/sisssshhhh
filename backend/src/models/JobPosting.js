const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  departmentTags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  requiredSkills: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  preferredSkills: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  stipendRange: {
    min: {
      type: Number,
      min: [0, 'Minimum stipend cannot be negative']
    },
    max: {
      type: Number,
      min: [0, 'Maximum stipend cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    period: {
      type: String,
      default: 'monthly',
      enum: ['monthly', 'annually', 'project']
    }
  },
  location: {
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'India'
    },
    isRemote: {
      type: Boolean,
      default: false
    },
    workMode: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite'],
      default: 'onsite'
    }
  },
  jobType: {
    type: String,
    enum: ['internship', 'full-time', 'part-time', 'contract', 'freelance'],
    required: [true, 'Job type is required']
  },
  duration: {
    type: String,
    trim: true,
    maxlength: [50, 'Duration cannot exceed 50 characters']
  },
  requirements: {
    minGPA: {
      type: Number,
      min: [0, 'Minimum GPA cannot be negative'],
      max: [10, 'Minimum GPA cannot exceed 10']
    },
    minYear: {
      type: String,
      enum: ['1st', '2nd', '3rd', '4th', 'M.Tech', 'PhD']
    },
    maxYear: {
      type: String,
      enum: ['1st', '2nd', '3rd', '4th', 'M.Tech', 'PhD']
    },
    departments: [{
      type: String,
      trim: true
    }]
  },
  conversionChanceEstimate: {
    type: Number,
    min: [0, 'Conversion chance cannot be negative'],
    max: [100, 'Conversion chance cannot exceed 100'],
    default: 50
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by user ID is required']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  expiryAt: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  applicationDeadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  maxApplications: {
    type: Number,
    min: [1, 'Maximum applications must be at least 1'],
    default: 100
  },
  currentApplications: {
    type: Number,
    default: 0,
    min: [0, 'Current applications cannot be negative']
  },
  embeddings: {
    type: [Number], // Vector embeddings for AI matching
    select: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  benefits: [{
    type: String,
    trim: true
  }],
  applicationProcess: {
    steps: [{
      step: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      order: {
        type: Number,
        required: true
      }
    }]
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
jobPostingSchema.index({ title: 'text', description: 'text', company: 'text' });
jobPostingSchema.index({ company: 1 });
jobPostingSchema.index({ status: 1 });
jobPostingSchema.index({ jobType: 1 });
jobPostingSchema.index({ 'location.city': 1 });
jobPostingSchema.index({ 'location.state': 1 });
jobPostingSchema.index({ departmentTags: 1 });
jobPostingSchema.index({ requiredSkills: 1 });
jobPostingSchema.index({ postedBy: 1 });
jobPostingSchema.index({ publishedAt: -1 });
jobPostingSchema.index({ expiryAt: 1 });
jobPostingSchema.index({ applicationDeadline: 1 });
jobPostingSchema.index({ isActive: 1 });

// Set publishedAt when status changes to published
jobPostingSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Check if job is still accepting applications
jobPostingSchema.methods.isAcceptingApplications = function() {
  const now = new Date();
  return this.status === 'published' && 
         this.isActive && 
         this.currentApplications < this.maxApplications &&
         now <= this.applicationDeadline &&
         now <= this.expiryAt;
};

// Get normalized skills for consistent matching
jobPostingSchema.methods.getNormalizedRequiredSkills = function() {
  return this.requiredSkills.map(skill => skill.toLowerCase().trim());
};

jobPostingSchema.methods.getNormalizedPreferredSkills = function() {
  return this.preferredSkills.map(skill => skill.toLowerCase().trim());
};

// Calculate skill match score with a profile
jobPostingSchema.methods.calculateSkillMatch = function(profileSkills) {
  const requiredSkills = this.getNormalizedRequiredSkills();
  const preferredSkills = this.getNormalizedPreferredSkills();
  const profileSkillsLower = profileSkills.map(skill => skill.toLowerCase().trim());
  
  let requiredMatch = 0;
  let preferredMatch = 0;
  
  // Calculate required skills match
  requiredSkills.forEach(skill => {
    if (profileSkillsLower.includes(skill)) {
      requiredMatch++;
    }
  });
  
  // Calculate preferred skills match
  preferredSkills.forEach(skill => {
    if (profileSkillsLower.includes(skill)) {
      preferredMatch++;
    }
  });
  
  const requiredScore = requiredSkills.length > 0 ? (requiredMatch / requiredSkills.length) * 70 : 0;
  const preferredScore = preferredSkills.length > 0 ? (preferredMatch / preferredSkills.length) * 30 : 0;
  
  return Math.round(requiredScore + preferredScore);
};

module.exports = mongoose.model('JobPosting', jobPostingSchema);

