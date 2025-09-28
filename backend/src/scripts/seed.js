const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Profile = require('../models/Profile');
const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');
const Certificate = require('../models/Certificate');

// Sample data
const sampleUsers = [
  {
    name: 'John Doe',
    email: 'john.doe@student.edu',
    password: 'password123',
    role: 'student',
    rollNo: 'CS2021001',
    department: 'Computer Science',
    year: '4th'
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@student.edu',
    password: 'password123',
    role: 'student',
    rollNo: 'CS2021002',
    department: 'Computer Science',
    year: '4th'
  },
  {
    name: 'Dr. Michael Johnson',
    email: 'michael.johnson@mentor.edu',
    password: 'password123',
    role: 'mentor',
    department: 'Computer Science'
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@placement.edu',
    password: 'password123',
    role: 'placement_cell',
    department: 'Placement Cell'
  },
  {
    name: 'Tech Corp HR',
    email: 'hr@techcorp.com',
    password: 'password123',
    role: 'recruiter',
    department: 'Human Resources'
  },
  {
    name: 'Admin User',
    email: 'admin@campus.edu',
    password: 'password123',
    role: 'admin',
    department: 'Administration'
  }
];

const sampleJobs = [/* keep your existing jobs data */];

const sampleProfiles = [/* keep your existing profiles data */];

// -------------------- DB Utils --------------------

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-placement');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearData() {
  try {
    await User.deleteMany({});
    await Profile.deleteMany({});
    await JobPosting.deleteMany({});
    await Application.deleteMany({});
    await Certificate.deleteMany({});
    console.log('🗑️  Cleared existing data');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// -------------------- Seeding Functions --------------------

async function createUsers() {
  try {
    const users = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({ ...userData, password: hashedPassword });
      await user.save();
      users.push(user);
    }
    console.log('👥 Created users');
    return users;
  } catch (error) {
    console.error('Error creating users:', error);
    return [];
  }
}

async function createProfiles(users) {
  try {
    const studentUsers = users.filter(user => user.role === 'student');
    const profiles = [];

    for (let i = 0; i < studentUsers.length && i < sampleProfiles.length; i++) {
      const profileData = {
        userId: studentUsers[i]._id,
        ...sampleProfiles[i]
      };

      const profile = new Profile(profileData);
      if (typeof profile.calculateEmployabilityScore === "function") {
        profile.calculateEmployabilityScore();
      }
      await profile.save();

      // Update user with profile reference
      await User.findByIdAndUpdate(studentUsers[i]._id, { profileId: profile._id });
      profiles.push(profile);
    }

    console.log('📄 Created profiles');
    return profiles;
  } catch (error) {
    console.error('Error creating profiles:', error);
    return [];
  }
}

async function createJobs(users) {
  try {
    const placementCellUser = users.find(user => user.role === 'placement_cell');
    const recruiterUser = users.find(user => user.role === 'recruiter');

    const jobs = [];
    for (let i = 0; i < sampleJobs.length; i++) {
      const jobData = {
        ...sampleJobs[i],
        postedBy: i === 0 ? placementCellUser._id : recruiterUser._id,
        status: 'published',
        publishedAt: new Date()
      };

      const job = new JobPosting(jobData);
      await job.save();
      jobs.push(job);
    }

    console.log('💼 Created job postings');
    return jobs;
  } catch (error) {
    console.error('Error creating jobs:', error);
    return [];
  }
}

async function createApplications(users, jobs) {
  try {
    const studentUsers = users.filter(user => user.role === 'student');
    const applications = [];

    if (studentUsers.length > 0 && jobs.length > 0) {
      const application1 = new Application({
        jobId: jobs[0]._id,
        studentId: studentUsers[0]._id,
        resumeSnapshotUrl: '/uploads/sample-resume-1.pdf',
        coverLetterSnapshot: 'I am very interested in this software developer position...',
        status: 'applied',
        fitScore: 85
      });
      if (typeof application1.addTimelineEvent === "function") {
        application1.addTimelineEvent('applied', studentUsers[0]._id, 'Application submitted');
      }
      await application1.save();
      applications.push(application1);

      if (studentUsers.length > 1 && jobs.length > 1) {
        const mentor = users.find(u => u.role === 'mentor');
        const application2 = new Application({
          jobId: jobs[1]._id,
          studentId: studentUsers[1]._id,
          resumeSnapshotUrl: '/uploads/sample-resume-2.pdf',
          coverLetterSnapshot: 'I am excited about this data science opportunity...',
          status: 'mentor_approved',
          fitScore: 90
        });
        if (typeof application2.addTimelineEvent === "function") {
          application2.addTimelineEvent('applied', studentUsers[1]._id, 'Application submitted');
          application2.addTimelineEvent('mentor_approved', mentor._id, 'Approved by mentor');
        }
        await application2.save();
        applications.push(application2);
      }
    }

    console.log('📝 Created applications');
    return applications;
  } catch (error) {
    console.error('Error creating applications:', error);
    return [];
  }
}

// -------------------- Main Seeder --------------------

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    await connectDB();
    await clearData();

    const users = await createUsers();
    const profiles = await createProfiles(users);
    const jobs = await createJobs(users);
    const applications = await createApplications(users, jobs);

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Created: ${users.length} users, ${profiles.length} profiles, ${jobs.length} jobs, ${applications.length} applications`);

    console.log('\n🔑 Sample login credentials:');
    console.log('Student: john.doe@student.edu / password123');
    console.log('Mentor: michael.johnson@mentor.edu / password123');
    console.log('Placement Cell: sarah.wilson@placement.edu / password123');
    console.log('Recruiter: hr@techcorp.com / password123');
    console.log('Admin: admin@campus.edu / password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
