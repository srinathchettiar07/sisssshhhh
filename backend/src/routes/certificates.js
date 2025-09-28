const express = require('express');
const { body, validationResult } = require('express-validator');
const Certificate = require('../models/Certificate');
const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const User = require('../models/User');
const { authorize, auditLog } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

/**
 * @swagger
 * /api/certificates:
 *   get:
 *     summary: Get certificates based on user role
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: Filter by job ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of certificates per page
 *     responses:
 *       200:
 *         description: Certificates retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const { studentId, jobId, page = 1, limit = 10 } = req.query;
    
    // Build filter based on user role
    let filter = { isActive: true };
    
    if (req.user.role === 'student') {
      filter.studentId = req.user._id;
    } else if (req.user.role === 'placement_cell' || req.user.role === 'admin') {
      // Placement cell and admin can see all certificates
      if (studentId) filter.studentId = studentId;
      if (jobId) filter.jobId = jobId;
    } else if (req.user.role === 'recruiter') {
      // Recruiters can see certificates for their jobs
      const userJobs = await JobPosting.find({ postedBy: req.user._id }).select('_id');
      filter.jobId = { $in: userJobs.map(job => job._id) };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get certificates with pagination
    const certificates = await Certificate.find(filter)
      .populate('studentId', 'name email rollNo department')
      .populate('jobId', 'title company')
      .populate('applicationId', 'status')
      .populate('supervisorFeedback.supervisorId', 'name email')
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Certificate.countDocuments(filter);

    res.json({
      success: true,
      data: certificates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve certificates'
    });
  }
});

/**
 * @swagger
 * /api/certificates/{id}:
 *   get:
 *     summary: Get certificate by ID
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate retrieved successfully
 *       404:
 *         description: Certificate not found
 */
router.get('/:id', async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('studentId', 'name email rollNo department year')
      .populate('jobId', 'title company description')
      .populate('applicationId', 'status appliedAt')
      .populate('supervisorFeedback.supervisorId', 'name email');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student' && certificate.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve certificate'
    });
  }
});

/**
 * @swagger
 * /api/certificates/generate:
 *   post:
 *     summary: Generate certificate
 *     tags: [Certificates]
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
 *               - supervisorFeedback
 *             properties:
 *               applicationId:
 *                 type: string
 *               supervisorFeedback:
 *                 type: object
 *                 required:
 *                   - rating
 *                   - feedback
 *                   - wouldRecommend
 *                 properties:
 *                   rating:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                   feedback:
 *                     type: string
 *                   skillsDemonstrated:
 *                     type: array
 *                     items:
 *                       type: string
 *                   achievements:
 *                     type: array
 *                     items:
 *                       type: string
 *                   wouldRecommend:
 *                     type: boolean
 *     responses:
 *       201:
 *         description: Certificate generated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Application not found
 */
router.post('/generate', authorize('placement_cell', 'recruiter', 'admin'), [
  body('applicationId').isMongoId().withMessage('Invalid application ID'),
  body('supervisorFeedback.rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('supervisorFeedback.feedback').trim().isLength({ min: 10, max: 1000 }).withMessage('Feedback must be between 10 and 1000 characters'),
  body('supervisorFeedback.skillsDemonstrated').optional().isArray().withMessage('Skills demonstrated must be an array'),
  body('supervisorFeedback.achievements').optional().isArray().withMessage('Achievements must be an array'),
  body('supervisorFeedback.wouldRecommend').isBoolean().withMessage('Would recommend must be a boolean')
], auditLog('create', 'certificate'), async (req, res) => {
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

    const { applicationId, supervisorFeedback } = req.body;

    // Get application details
    const application = await Application.findById(applicationId)
      .populate('jobId', 'title company')
      .populate('studentId', 'name email rollNo department');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if application is in a completed state
    if (!['offer_accepted', 'interview_completed'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Application must be completed to generate certificate'
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ applicationId });
    if (existingCertificate) {
      return res.status(409).json({
        success: false,
        message: 'Certificate already exists for this application'
      });
    }

    // Create certificate
    const certificate = new Certificate({
      studentId: application.studentId._id,
      jobId: application.jobId._id,
      applicationId: application._id,
      supervisorFeedback: {
        supervisorId: req.user._id,
        ...supervisorFeedback
      },
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    });

    await certificate.save();

    // Generate PDF and QR code via AI service
    try {
      const response = await axios.post(`${process.env.PYTHON_AI_SERVICE_URL}/api/ai/generate-certificate`, {
        certificateId: certificate._id.toString(),
        studentName: application.studentId.name,
        jobTitle: application.jobId.title,
        company: application.jobId.company,
        supervisorFeedback: certificate.supervisorFeedback,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil,
        verificationCode: certificate.verificationCode
      });

      // Update certificate with PDF URL and QR code
      certificate.pdfUrl = response.data.pdfUrl;
      certificate.qrCodeUrl = response.data.qrCodeUrl;
      await certificate.save();
    } catch (aiError) {
      console.error('AI service error:', aiError);
      // Continue without failing the certificate creation
    }

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate'
    });
  }
});

/**
 * @swagger
 * /api/certificates/verify/{verificationCode}:
 *   get:
 *     summary: Verify certificate
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: verificationCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Certificate verification code
 *     responses:
 *       200:
 *         description: Certificate verification successful
 *       404:
 *         description: Certificate not found
 *       400:
 *         description: Certificate invalid or expired
 */
router.get('/verify/:verificationCode', async (req, res) => {
  try {
    const { verificationCode } = req.params;

    const certificate = await Certificate.findOne({ verificationCode })
      .populate('studentId', 'name email rollNo department')
      .populate('jobId', 'title company')
      .populate('supervisorFeedback.supervisorId', 'name email');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check if certificate is valid
    if (!certificate.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Certificate is invalid or expired',
        data: certificate.getPublicData()
      });
    }

    res.json({
      success: true,
      message: 'Certificate is valid',
      data: {
        certificate: certificate.getPublicData(),
        student: certificate.studentId,
        job: certificate.jobId,
        supervisor: certificate.supervisorFeedback.supervisorId,
        feedback: certificate.supervisorFeedback,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate'
    });
  }
});

/**
 * @swagger
 * /api/certificates/{id}/download:
 *   get:
 *     summary: Download certificate PDF
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate PDF downloaded successfully
 *       404:
 *         description: Certificate not found
 *       403:
 *         description: Access denied
 */
router.get('/:id/download', async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student' && certificate.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!certificate.pdfUrl) {
      return res.status(404).json({
        success: false,
        message: 'Certificate PDF not available'
      });
    }

    // Redirect to PDF URL or serve file
    res.redirect(certificate.pdfUrl);
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate'
    });
  }
});

/**
 * @swagger
 * /api/certificates/{id}/revoke:
 *   patch:
 *     summary: Revoke certificate (admin only)
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate revoked successfully
 *       404:
 *         description: Certificate not found
 *       403:
 *         description: Insufficient permissions
 */
router.patch('/:id/revoke', authorize('admin'), auditLog('update', 'certificate'), async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    certificate.isActive = false;
    await certificate.save();

    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Revoke certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke certificate'
    });
  }
});

module.exports = router;

