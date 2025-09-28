const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const User = require('../models/User');
const { authorize, auditLog } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get applications based on user role
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by application status
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: Filter by job ID
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of applications per page
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const { status, jobId, studentId, page = 1, limit = 10 } = req.query;
    
    // Build filter based on user role
    let filter = { isActive: true };
    
    if (req.user.role === 'student') {
      filter.studentId = req.user._id;
    } else if (req.user.role === 'mentor') {
      // Mentors see applications that need their approval
      filter['mentorApproval.status'] = 'pending';
    } else if (req.user.role === 'placement_cell') {
      // Placement cell sees all applications
      if (jobId) filter.jobId = jobId;
      if (studentId) filter.studentId = studentId;
    } else if (req.user.role === 'recruiter') {
      // Recruiters see applications for their jobs
      const userJobs = await JobPosting.find({ postedBy: req.user._id }).select('_id');
      filter.jobId = { $in: userJobs.map(job => job._id) };
    }

    if (status) filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get applications with pagination
    const applications = await Application.find(filter)
      .populate('jobId', 'title company jobType')
      .populate('studentId', 'name email rollNo department year')
      .populate('mentorApproval.mentorId', 'name email')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Application.countDocuments(filter);

    res.json({
      success: true,
      data: applications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications'
    });
  }
});

/**
 * @swagger
 * /api/applications/{id}:
 *   get:
 *     summary: Get application by ID
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved successfully
 *       404:
 *         description: Application not found
 */
router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('jobId', 'title company description requiredSkills location')
      .populate('studentId', 'name email rollNo department year')
      .populate('mentorApproval.mentorId', 'name email')
      .populate('interviewDetails.interviewer', 'name email')
      .populate('timeline.actor', 'name email role');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student' && application.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application'
    });
  }
});

/**
 * @swagger
 * /api/applications/{id}/status:
 *   patch:
 *     summary: Update application status
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [mentor_approved, mentor_rejected, shortlisted, interviewed, offer_made, rejected]
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application status updated successfully
 *       404:
 *         description: Application not found
 *       403:
 *         description: Insufficient permissions
 */
router.patch('/:id/status', [
  body('status').isIn(['mentor_approved', 'mentor_rejected', 'shortlisted', 'interviewed', 'offer_made', 'rejected']).withMessage('Invalid status'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], auditLog('update', 'application'), async (req, res) => {
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

    const { status, comment } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check permissions based on status and user role
    const canUpdate = checkUpdatePermissions(req.user.role, status, application);
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update status'
      });
    }

    // Update application status
    application.status = status;
    
    // Update mentor approval if needed
    if (['mentor_approved', 'mentor_rejected'].includes(status)) {
      application.mentorApproval.status = status === 'mentor_approved' ? 'approved' : 'rejected';
      application.mentorApproval.mentorId = req.user._id;
      application.mentorApproval.comment = comment;
      application.mentorApproval.approvedAt = new Date();
    }

    // Add timeline event
    application.addTimelineEvent(status, req.user._id, comment);

    await application.save();

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status'
    });
  }
});

/**
 * @swagger
 * /api/applications/{id}/mentor-approval:
 *   patch:
 *     summary: Mentor approval for application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mentor approval updated successfully
 *       404:
 *         description: Application not found
 *       403:
 *         description: Insufficient permissions
 */
router.patch('/:id/mentor-approval', authorize('mentor'), [
  body('approved').isBoolean().withMessage('Approved must be a boolean'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], auditLog('update', 'application'), async (req, res) => {
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

    const { approved, comment } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update mentor approval
    application.mentorApproval.status = approved ? 'approved' : 'rejected';
    application.mentorApproval.mentorId = req.user._id;
    application.mentorApproval.comment = comment;
    application.mentorApproval.approvedAt = new Date();

    // Update application status
    application.status = approved ? 'mentor_approved' : 'mentor_rejected';

    // Add timeline event
    application.addTimelineEvent(
      approved ? 'mentor_approved' : 'mentor_rejected',
      req.user._id,
      comment
    );

    await application.save();

    res.json({
      success: true,
      message: `Application ${approved ? 'approved' : 'rejected'} by mentor`,
      data: application
    });
  } catch (error) {
    console.error('Mentor approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update mentor approval'
    });
  }
});

/**
 * @swagger
 * /api/applications/{id}/schedule-interview:
 *   post:
 *     summary: Schedule interview
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledAt
 *             properties:
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               location:
 *                 type: string
 *               meetingLink:
 *                 type: string
 *               interviewer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interview scheduled successfully
 *       404:
 *         description: Application not found
 *       403:
 *         description: Insufficient permissions
 */
router.post('/:id/schedule-interview', authorize('placement_cell', 'recruiter', 'admin'), [
  body('scheduledAt').isISO8601().withMessage('Invalid date format'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters'),
  body('meetingLink').optional().isURL().withMessage('Invalid meeting link'),
  body('interviewer').optional().isMongoId().withMessage('Invalid interviewer ID')
], auditLog('update', 'application'), async (req, res) => {
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

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update interview details
    application.interviewDetails = {
      ...application.interviewDetails,
      ...req.body,
      scheduledAt: new Date(req.body.scheduledAt)
    };

    // Update application status
    application.status = 'interview_scheduled';

    // Add timeline event
    application.addTimelineEvent('interview_scheduled', req.user._id, 'Interview scheduled');

    await application.save();

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: application
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview'
    });
  }
});

/**
 * @swagger
 * /api/applications/{id}/timeline:
 *   get:
 *     summary: Get application timeline
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Timeline retrieved successfully
 *       404:
 *         description: Application not found
 */
router.get('/:id/timeline', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('timeline.actor', 'name email role');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student' && application.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: application.timeline
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve timeline'
    });
  }
});

// Helper function to check update permissions
function checkUpdatePermissions(userRole, status, application) {
  switch (status) {
    case 'mentor_approved':
    case 'mentor_rejected':
      return userRole === 'mentor';
    case 'shortlisted':
    case 'interviewed':
    case 'offer_made':
    case 'rejected':
      return ['placement_cell', 'recruiter', 'admin'].includes(userRole);
    default:
      return false;
  }
}

module.exports = router;

