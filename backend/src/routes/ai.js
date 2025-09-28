const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const Profile = require('../models/Profile');
const JobPosting = require('../models/JobPosting');
const User = require('../models/User');

const router = express.Router();

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with AI career coach
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *       400:
 *         description: Validation error
 */
router.post('/chat', [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('context').optional().trim().isLength({ max: 2000 }).withMessage('Context cannot exceed 2000 characters'),
  body('fileUrl').optional().isURL().withMessage('Invalid file URL')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { message, context, fileUrl } = req.body;
    const userId = req.user._id;

    // Get user profile for context
    const profile = await Profile.findOne({ userId }).populate('userId', 'name role department year');

    // Call AI service
    try {
      const response = await axios.post(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/chat`, {
        message,
        context,
        fileUrl,
        userId: userId.toString(),
        userProfile: profile ? {
          name: profile.userId.name,
          role: profile.userId.role,
          department: profile.userId.department,
          year: profile.userId.year,
          skills: profile.skills,
          gpa: profile.gpa,
          projects: profile.projects
        } : null
      });

      res.json({
        success: true,
        data: {
          response: response.data.response,
          sources: response.data.sources || [],
          suggestions: response.data.suggestions || []
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Fallback response
      res.json({
        success: true,
        data: {
          response: "I'm here to help with your career questions! Please try again or contact support if the issue persists.",
          sources: [],
          suggestions: [
            "Ask about resume tips",
            "Get interview preparation advice",
            "Learn about skill development"
          ]
        }
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat request'
    });
  }
});

/**
 * @swagger
 * /api/ai/embeddings:
 *   post:
 *     summary: Generate embeddings for text
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [resume, job, document]
 *     responses:
 *       200:
 *         description: Embeddings generated successfully
 *       400:
 *         description: Validation error
 */
router.post('/embeddings', [
  body('text').trim().isLength({ min: 10, max: 10000 }).withMessage('Text must be between 10 and 10000 characters'),
  body('type').optional().isIn(['resume', 'job', 'document']).withMessage('Invalid type')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { text, type = 'document' } = req.body;

    // Call AI service
    try {
      const response = await axios.post(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/embeddings`, {
        text,
        type
      });

      res.json({
        success: true,
        data: {
          embeddings: response.data.embeddings,
          dimension: response.data.dimension
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      res.status(500).json({
        success: false,
        message: 'AI service unavailable'
      });
    }
  } catch (error) {
    console.error('Generate embeddings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate embeddings'
    });
  }
});

/**
 * @swagger
 * /api/ai/recommendations/{studentId}:
 *   get:
 *     summary: Get job recommendations for student
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *       404:
 *         description: Student not found
 */
router.get('/recommendations/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student profile
    const profile = await Profile.findOne({ userId: studentId })
      .populate('userId', 'name email role department year');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Call AI service for recommendations
    try {
      const response = await axios.get(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/recommendations/${studentId}`);

      res.json({
        success: true,
        data: {
          recommendations: response.data.recommendations,
          profile: profile
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Fallback to basic recommendations
      const jobs = await JobPosting.find({
        status: 'published',
        isActive: true,
        $or: [
          { requiredSkills: { $in: profile.skills } },
          { departmentTags: { $in: [profile.userId.department] } }
        ]
      }).limit(10);

      const recommendations = jobs.map(job => ({
        jobId: job._id,
        title: job.title,
        company: job.company,
        fitScore: job.calculateSkillMatch(profile.skills),
        reason: 'Skill match',
        location: job.location,
        jobType: job.jobType
      }));

      res.json({
        success: true,
        data: {
          recommendations,
          profile: profile
        }
      });
    }
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendations'
    });
  }
});

/**
 * @swagger
 * /api/ai/resume-parse:
 *   post:
 *     summary: Parse resume and extract information
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resumeUrl
 *             properties:
 *               resumeUrl:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resume parsed successfully
 *       400:
 *         description: Validation error
 */
router.post('/resume-parse', [
  body('resumeUrl').isURL().withMessage('Invalid resume URL'),
  body('userId').optional().isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { resumeUrl, userId } = req.body;

    // Call AI service
    try {
      const response = await axios.post(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/resume-parse`, {
        resumeUrl,
        userId: userId || req.user._id.toString()
      });

      // Update profile with extracted information
      if (userId || req.user._id) {
        const profile = await Profile.findOne({ userId: userId || req.user._id });
        if (profile) {
          if (response.data.skills) {
            profile.skills = [...new Set([...profile.skills, ...response.data.skills])];
          }
          if (response.data.projects) {
            profile.projects = [...profile.projects, ...response.data.projects];
          }
          profile.calculateEmployabilityScore();
          await profile.save();
        }
      }

      res.json({
        success: true,
        data: {
          skills: response.data.skills || [],
          projects: response.data.projects || [],
          experience: response.data.experience || [],
          education: response.data.education || [],
          summary: response.data.summary || ''
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      res.status(500).json({
        success: false,
        message: 'AI service unavailable'
      });
    }
  } catch (error) {
    console.error('Resume parse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse resume'
    });
  }
});

/**
 * @swagger
 * /api/ai/similar-jobs:
 *   post:
 *     summary: Find similar jobs
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *             properties:
 *               jobId:
 *                 type: string
 *               limit:
 *                 type: number
 *     responses:
 *       200:
 *         description: Similar jobs found successfully
 *       404:
 *         description: Job not found
 */
router.post('/similar-jobs', [
  body('jobId').isMongoId().withMessage('Invalid job ID'),
  body('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { jobId, limit = 5 } = req.body;

    // Get the reference job
    const referenceJob = await JobPosting.findById(jobId);
    if (!referenceJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Call AI service for similar jobs
    try {
      const response = await axios.post(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/similar-jobs`, {
        jobId,
        limit
      });

      res.json({
        success: true,
        data: {
          referenceJob: referenceJob,
          similarJobs: response.data.similarJobs
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Fallback to basic similarity based on skills
      const jobs = await JobPosting.find({
        _id: { $ne: jobId },
        status: 'published',
        isActive: true,
        requiredSkills: { $in: referenceJob.requiredSkills }
      }).limit(parseInt(limit));

      res.json({
        success: true,
        data: {
          referenceJob: referenceJob,
          similarJobs: jobs
        }
      });
    }
  } catch (error) {
    console.error('Find similar jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find similar jobs'
    });
  }
});

/**
 * @swagger
 * /api/ai/analyze-application:
 *   post:
 *     summary: Analyze application fit
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicationId
 *             properties:
 *               applicationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application analyzed successfully
 *       404:
 *         description: Application not found
 */
router.post('/analyze-application', [
  body('applicationId').isMongoId().withMessage('Invalid application ID')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { applicationId } = req.body;

    // Get application details
    const Application = require('../models/Application');
    const application = await Application.findById(applicationId)
      .populate('jobId', 'title company description requiredSkills')
      .populate('studentId', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Get student profile
    const profile = await Profile.findOne({ userId: application.studentId._id });

    // Call AI service for analysis
    try {
      const response = await axios.post(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/analyze-application`, {
        applicationId,
        jobData: application.jobId,
        studentProfile: profile,
        applicationData: application
      });

      // Update application with AI insights
      application.aiInsights = response.data.insights;
      application.fitScore = response.data.fitScore;
      await application.save();

      res.json({
        success: true,
        data: {
          application: application,
          analysis: response.data.analysis,
          recommendations: response.data.recommendations
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Fallback analysis
      const fitScore = application.jobId.calculateSkillMatch(profile?.skills || []);
      
      res.json({
        success: true,
        data: {
          application: application,
          analysis: {
            fitScore,
            skillMatch: fitScore,
            strengths: profile?.skills?.filter(skill => 
              application.jobId.requiredSkills.includes(skill)
            ) || [],
            improvements: application.jobId.requiredSkills.filter(skill => 
              !profile?.skills?.includes(skill)
            ) || []
          },
          recommendations: [
            'Consider highlighting relevant skills in your resume',
            'Prepare examples of your experience with required technologies',
            'Research the company culture and values'
          ]
        }
      });
    }
  } catch (error) {
    console.error('Analyze application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze application'
    });
  }
});

module.exports = router;

