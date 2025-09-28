const express = require('express');
const { body, validationResult, query } = require('express-validator');
const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');
const { authorize, auditLog } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all job postings
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, company, description
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Filter by company
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum: [internship, full-time, part-time, contract, freelance]
 *         description: Filter by job type
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Filter by required skills (comma-separated)
 *       - in: query
 *         name: minStipend
 *         schema:
 *           type: number
 *         description: Minimum stipend
 *       - in: query
 *         name: maxStipend
 *         schema:
 *           type: number
 *         description: Maximum stipend
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of jobs per page
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      company,
      jobType,
      location,
      skills,
      minStipend,
      maxStipend,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {
      status: 'published',
      isActive: true,
      applicationDeadline: { $gte: new Date() },
      expiryAt: { $gte: new Date() }
    };

    if (search) {
      filter.$text = { $search: search };
    }
    if (company) filter.company = new RegExp(company, 'i');
    if (jobType) filter.jobType = jobType;
    if (location) {
      filter.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') }
      ];
    }
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim().toLowerCase());
      filter.requiredSkills = { $in: skillArray };
    }
    if (minStipend || maxStipend) {
      filter['stipendRange.min'] = {};
      if (minStipend) filter['stipendRange.min'].$gte = parseInt(minStipend);
      if (maxStipend) filter['stipendRange.max'] = { $lte: parseInt(maxStipend) };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get jobs with pagination
    const jobs = await JobPosting.find(filter)
      .populate('postedBy', 'name email company')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await JobPosting.countDocuments(filter);

    // Add fit score for students
    let jobsWithFitScore = jobs;
    if (req.user.role === 'student') {
      const Profile = require('../models/Profile');
      const profile = await Profile.findOne({ userId: req.user._id });
      
      if (profile) {
        jobsWithFitScore = jobs.map(job => ({
          ...job.toObject(),
          fitScore: job.calculateSkillMatch(profile.skills)
        }));
      }
    }

    res.json({
      success: true,
      data: jobsWithFitScore,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve jobs'
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *       404:
 *         description: Job not found
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id)
      .populate('postedBy', 'name email company');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user has applied to this job
    let hasApplied = false;
    if (req.user.role === 'student') {
      const application = await Application.findOne({
        jobId: req.params.id,
        studentId: req.user._id
      });
      hasApplied = !!application;
    }

    // Add fit score for students
    let jobWithFitScore = job.toObject();
    if (req.user.role === 'student') {
      const Profile = require('../models/Profile');
      const profile = await Profile.findOne({ userId: req.user._id });
      
      if (profile) {
        jobWithFitScore.fitScore = job.calculateSkillMatch(profile.skills);
      }
    }

    res.json({
      success: true,
      data: {
        ...jobWithFitScore,
        hasApplied
      }
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve job'
    });
  }
});

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - company
 *               - description
 *               - jobType
 *             properties:
 *               title:
 *                 type: string
 *               company:
 *                 type: string
 *               description:
 *                 type: string
 *               requiredSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *               jobType:
 *                 type: string
 *                 enum: [internship, full-time, part-time, contract, freelance]
 *               stipendRange:
 *                 type: object
 *               location:
 *                 type: object
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions
 */
router.post('/', authorize('placement_cell', 'recruiter', 'admin'), [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('company').trim().isLength({ min: 2, max: 100 }).withMessage('Company must be between 2 and 100 characters'),
  body('description').trim().isLength({ min: 50, max: 5000 }).withMessage('Description must be between 50 and 5000 characters'),
  body('jobType').isIn(['internship', 'full-time', 'part-time', 'contract', 'freelance']).withMessage('Invalid job type'),
  body('requiredSkills').optional().isArray().withMessage('Required skills must be an array'),
  body('stipendRange.min').optional().isNumeric().withMessage('Minimum stipend must be a number'),
  body('stipendRange.max').optional().isNumeric().withMessage('Maximum stipend must be a number')
], auditLog('create', 'job'), async (req, res) => {
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

    const jobData = {
      ...req.body,
      postedBy: req.user._id,
      status: 'draft'
    };

    const job = new JobPosting(jobData);
    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job'
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               requiredSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       404:
 *         description: Job not found
 *       403:
 *         description: Insufficient permissions
 */
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').optional().trim().isLength({ min: 50, max: 5000 }).withMessage('Description must be between 50 and 5000 characters'),
  body('requiredSkills').optional().isArray().withMessage('Required skills must be an array')
], auditLog('update', 'job'), async (req, res) => {
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

    const job = await JobPosting.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user can update this job
    if (req.user.role !== 'admin' && job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own job postings'
      });
    }

    // Update job
    Object.assign(job, req.body);
    await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job'
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}/publish:
 *   patch:
 *     summary: Publish job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job published successfully
 *       404:
 *         description: Job not found
 *       403:
 *         description: Insufficient permissions
 */
router.patch('/:id/publish', authorize('placement_cell', 'recruiter', 'admin'), auditLog('update', 'job'), async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user can publish this job
    if (req.user.role !== 'admin' && job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish your own job postings'
      });
    }

    job.status = 'published';
    job.publishedAt = new Date();
    await job.save();

    res.json({
      success: true,
      message: 'Job published successfully',
      data: job
    });
  } catch (error) {
    console.error('Publish job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish job'
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}/apply:
 *   post:
 *     summary: Apply to job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coverLetter:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Already applied
 */
router.post('/:id/apply', authorize('student'), [
  body('coverLetter').optional().isLength({ max: 2000 }).withMessage('Cover letter cannot exceed 2000 characters')
], auditLog('create', 'application'), async (req, res) => {
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

    const jobId = req.params.id;
    const studentId = req.user._id;

    // Check if job exists and is accepting applications
    const job = await JobPosting.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (!job.isAcceptingApplications()) {
      return res.status(400).json({
        success: false,
        message: 'Job is not accepting applications'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      jobId,
      studentId
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied to this job'
      });
    }

    // Get student profile for resume URL
    const Profile = require('../models/Profile');
    const profile = await Profile.findOne({ userId: studentId });

    // Create application
    const application = new Application({
      jobId,
      studentId,
      resumeSnapshotUrl: profile?.resumeUrl,
      coverLetterSnapshot: req.body.coverLetter,
      status: 'applied'
    });

    // Add timeline event
    application.addTimelineEvent('applied', studentId, 'Application submitted');

    await application.save();

    // Update job application count
    await JobPosting.findByIdAndUpdate(jobId, {
      $inc: { currentApplications: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application'
    });
  }
});

module.exports = router;

