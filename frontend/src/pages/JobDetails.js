import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Briefcase, 
  Building, 
  Star,
  Users,
  Calendar,
  ExternalLink,
  Heart,
  Share2
} from 'lucide-react';
import { jobsAPI, applicationsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isApplying, setIsApplying] = useState(false);

  const { data: jobData, isLoading, error } = useQuery(
    ['job', id],
    () => jobsAPI.getJob(id),
    {
      enabled: !!id
    }
  );

  const job = jobData?.data;

  const handleApply = async () => {
    if (!user) {
      toast.error('Please log in to apply for jobs');
      return;
    }

    setIsApplying(true);
    try {
      const result = await applicationsAPI.createApplication({
        jobId: id,
        coverLetter: 'I am very interested in this position and would like to apply.'
      });

      if (result.success) {
        toast.success('Application submitted successfully!');
      } else {
        toast.error(result.error || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('Failed to submit application');
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-white mb-2">Job not found</h3>
        <p className="text-dark-400 mb-4">The job you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/jobs')}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center text-dark-400 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>
      </div>

      {/* Job Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="w-8 h-8 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-bold text-white">{job.title}</h1>
                {job.fitScore && (
                  <div className="flex items-center text-yellow-400 text-sm">
                    <Star className="w-4 h-4 mr-1" />
                    {job.fitScore}% match
                  </div>
                )}
              </div>
              
              <p className="text-primary-600 text-xl font-semibold mb-2">{job.company}</p>
              
              <div className="flex items-center space-x-6 text-dark-400 mb-4">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {job.location}
                </div>
                <div className="flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  {job.jobType}
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  {job.experience}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Posted {new Date(job.postedAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-white">
                  {job.salary ? `₹${job.salary.toLocaleString()}` : 'Salary not specified'}
                </span>
                {job.salaryType && (
                  <span className="text-dark-400">per {job.salaryType}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <div className="flex space-x-2">
              <button className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200">
                <Heart className="w-5 h-5 text-dark-400" />
              </button>
              <button className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200">
                <Share2 className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? 'Applying...' : 'Apply Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Job Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Job Description</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-dark-300 leading-relaxed">
                {job.description}
              </p>
            </div>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Requirements</h2>
              <ul className="space-y-2">
                {job.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-dark-300">{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Key Responsibilities</h2>
              <ul className="space-y-2">
                {job.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-dark-300">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-600 text-white rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">About {job.company}</h3>
            <div className="space-y-3">
              <div className="flex items-center text-dark-400">
                <Users className="w-4 h-4 mr-2" />
                <span>Company Size: {job.companySize || 'Not specified'}</span>
              </div>
              <div className="flex items-center text-dark-400">
                <Building className="w-4 h-4 mr-2" />
                <span>Industry: {job.industry || 'Not specified'}</span>
              </div>
              {job.companyWebsite && (
                <a
                  href={job.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-500"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Company Website
                </a>
              )}
            </div>
          </div>

          {/* Job Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Job Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-400">Job Type:</span>
                <span className="text-white">{job.jobType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Experience:</span>
                <span className="text-white">{job.experience}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Location:</span>
                <span className="text-white">{job.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Posted:</span>
                <span className="text-white">{new Date(job.postedAt).toLocaleDateString()}</span>
              </div>
              {job.deadline && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Deadline:</span>
                  <span className="text-white">{new Date(job.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Benefits</h3>
              <ul className="space-y-2">
                {job.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-dark-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
