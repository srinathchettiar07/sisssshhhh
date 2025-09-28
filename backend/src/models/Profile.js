const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gpa: {
    type: Number,
    min: 0,
    max: 10,
    default: null,
  },
  skills: {
    type: [String],
    default: [],
  },
  projects: [
    {
      title: String,
      description: String,
      link: String,
    },
  ],
  experience: [
    {
      company: String,
      role: String,
      startDate: Date,
      endDate: Date,
    },
  ],
  employabilityScore: {
    type: Number,
    default: 0,
  },
});

// Method to calculate employability score
profileSchema.methods.calculateEmployabilityScore = function () {
  let score = 0;

  if (this.gpa) {
    score += this.gpa * 10; // GPA out of 10 gets weighted
  }

  if (this.skills && this.skills.length > 0) {
    score += this.skills.length * 5; // +5 points per skill
  }

  if (this.projects && this.projects.length > 0) {
    score += this.projects.length * 10; // +10 points per project
  }

  if (this.experience && this.experience.length > 0) {
    score += this.experience.length * 15; // +15 per job/internship
  }

  this.employabilityScore = score;
  return this.employabilityScore;
};

module.exports = mongoose.model('Profile', profileSchema);
