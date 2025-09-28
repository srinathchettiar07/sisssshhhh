const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { isOwner, auditLog } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'application/msword' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
});

/**
 * @swagger
 * /api/profiles:
 *   get:
 *     summary: Get all profiles
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Filter by skills (comma-separated)
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *         description: Minimum employability score
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of profiles per page
 *     responses:
 *       200:
 *         description: Profiles retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const { skills, minScore, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = { isPublic: true };
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim().toLowerCase());
      filter.skills = { $in: skillArray };
    }
    if (minScore) {
      filter.employabilityScore = { $gte: parseInt(minScore) };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get profiles with pagination
    const profiles = await Profile.find(filter)
      .populate('userId', 'name email role department year')
      .sort({ employabilityScore: -1, lastUpdated: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Profile.countDocuments(filter);

    res.json({
      success: true,
      data: profiles,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profiles'
    });
  }
});

/**
 * @swagger
 * /api/profiles/{id}:
 *   get:
 *     summary: Get profile by ID
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       404:
 *         description: Profile not found
 */
router.get('/:id', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .populate('userId', 'name email role department year');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Check if user can view this profile
    if (req.user.role === 'student' && profile.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Create or update profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coverLetter:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               gpa:
 *                 type: number
 *               projects:
 *                 type: array
 *                 items:
 *                   type: object
 *               socialLinks:
 *                 type: object
 *               preferences:
 *                 type: object
 *     responses:
 *       201:
 *         description: Profile created/updated successfully
 *       400:
 *         description: Validation error
 */
router.post('/', [
  body('coverLetter').optional().isLength({ max: 2000 }).withMessage('Cover letter cannot exceed 2000 characters'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('gpa').optional().isFloat({ min: 0, max: 10 }).withMessage('GPA must be between 0 and 10'),
  body('projects').optional().isArray().withMessage('Projects must be an array')
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

    const userId = req.user._id;
    const profileData = req.body;

    // Check if profile already exists
    let profile = await Profile.findOne({ userId });

    if (profile) {
      // Update existing profile
      Object.assign(profile, profileData);
      profile.lastUpdated = new Date();
    } else {
      // Create new profile
      profile = new Profile({
        userId,
        ...profileData
      });
    }

    // Calculate employability score
    profile.calculateEmployabilityScore();

    await profile.save();

    // Update user's profileId reference
    await User.findByIdAndUpdate(userId, { profileId: profile._id });

    res.status(201).json({
      success: true,
      message: 'Profile saved successfully',
      data: profile
    });
  } catch (error) {
    console.error('Save profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save profile'
    });
  }
});

/**
 * @swagger
 * /api/profiles/{id}:
 *   put:
 *     summary: Update profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coverLetter:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               gpa:
 *                 type: number
 *               projects:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       404:
 *         description: Profile not found
 *       403:
 *         description: Access denied
 */
router.put('/:id', isOwner('profile'), [
  body('coverLetter').optional().isLength({ max: 2000 }).withMessage('Cover letter cannot exceed 2000 characters'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('gpa').optional().isFloat({ min: 0, max: 10 }).withMessage('GPA must be between 0 and 10')
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

    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Update profile
    Object.assign(profile, req.body);
    profile.lastUpdated = new Date();
    profile.calculateEmployabilityScore();

    await profile.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @swagger
 * /api/profiles/upload-resume:
 *   post:
 *     summary: Upload resume
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
 *       400:
 *         description: Invalid file
 */
router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user._id;
    const resumeUrl = `/uploads/${req.file.filename}`;

    // Find or create profile
    let profile = await Profile.findOne({ userId });
    if (!profile) {
      profile = new Profile({ userId });
    }

    profile.resumeUrl = resumeUrl;
    profile.calculateEmployabilityScore();
    await profile.save();

    // Trigger AI processing for resume parsing
    try {
      await axios.post(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/resume-parse`, {
        userId: userId.toString(),
        resumeUrl: resumeUrl,
        filePath: req.file.path
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      // Continue without failing the upload
    }

    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeUrl,
        employabilityScore: profile.employabilityScore
      }
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload resume'
    });
  }
});

/**
 * @swagger
 * /api/profiles/{id}/recommendations:
 *   get:
 *     summary: Get job recommendations for profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *       404:
 *         description: Profile not found
 */
router.get('/:id/recommendations', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .populate('userId', 'name email role department year');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Call AI service for recommendations
    try {
      const response = await axios.get(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/recommendations/${req.params.id}`);
      
      res.json({
        success: true,
        data: {
          profile: profile,
          recommendations: response.data.recommendations
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      // Return basic recommendations based on skills
      const JobPosting = require('../models/JobPosting');
      const jobs = await JobPosting.find({
        status: 'published',
        isActive: true,
        $or: [
          { requiredSkills: { $in: profile.skills } },
          { departmentTags: { $in: [profile.userId.department] } }
        ]
      }).limit(10);

      res.json({
        success: true,
        data: {
          profile: profile,
          recommendations: jobs.map(job => ({
            jobId: job._id,
            title: job.title,
            company: job.company,
            fitScore: job.calculateSkillMatch(profile.skills),
            reason: 'Skill match'
          }))
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

module.exports = router;

