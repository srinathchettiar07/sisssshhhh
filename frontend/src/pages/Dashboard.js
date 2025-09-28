import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { 
  Briefcase, 
  FileText, 
  Award, 
  TrendingUp, 
  Users, 
  Calendar,
  Star,
  ArrowUpRight
} from 'lucide-react';
import { jobsAPI, applicationsAPI, certificatesAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch data based on user role
  const { data: jobsData, isLoading: jobsLoading } = useQuery(
    'dashboard-jobs',
    () => jobsAPI.getJobs({ limit: 5 }),
    { enabled: user?.role === 'student' || user?.role === 'placement_cell' }
  );

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery(
    'dashboard-applications',
    () => applicationsAPI.getApplications({ limit: 5 }),
    { enabled: true }
  );

  const { data: certificatesData, isLoading: certificatesLoading } = useQuery(
    'dashboard-certificates',
    () => certificatesAPI.getCertificates({ limit: 3 }),
    { enabled: user?.role === 'student' }
  );

  const stats = [
    {
      name: 'Total Jobs',
      value: jobsData?.data?.pagination?.total || 0,
      icon: Briefcase,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      name: 'Applications',
      value: applicationsData?.data?.pagination?.total || 0,
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      name: 'Certificates',
      value: certificatesData?.data?.pagination?.total || 0,
      icon: Award,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      name: 'Success Rate',
      value: '85%',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
  ];

  const recentJobs = jobsData?.data?.data || [];
  const recentApplications = applicationsData?.data?.data || [];
  const recentCertificates = certificatesData?.data?.data || [];

  if (jobsLoading || applicationsLoading || certificatesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-primary-100">
          {user?.role === 'student' && "Ready to find your dream job? Let's get started!"}
          {user?.role === 'mentor' && "Help students succeed in their placement journey."}
          {user?.role === 'placement_cell' && "Manage placements and help students achieve their goals."}
          {user?.role === 'recruiter' && "Discover talented students for your organization."}
          {user?.role === 'admin' && "Oversee the entire placement platform."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm font-medium">{stat.name}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Jobs</h2>
            <a href="/jobs" className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center">
              View all
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </a>
          </div>
          
          <div className="space-y-3">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <div key={job._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{job.title}</h3>
                    <p className="text-dark-400 text-sm">{job.company}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {job.fitScore && (
                      <div className="flex items-center text-yellow-400 text-sm">
                        <Star className="w-4 h-4 mr-1" />
                        {job.fitScore}%
                      </div>
                    )}
                    <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">
                      {job.jobType}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-400 text-center py-4">No recent jobs</p>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Applications</h2>
            <a href="/applications" className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center">
              View all
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </a>
          </div>
          
          <div className="space-y-3">
            {recentApplications.length > 0 ? (
              recentApplications.map((application) => (
                <div key={application._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{application.jobId?.title}</h3>
                    <p className="text-dark-400 text-sm">{application.jobId?.company}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      application.status === 'applied' ? 'bg-blue-600 text-white' :
                      application.status === 'shortlisted' ? 'bg-green-600 text-white' :
                      application.status === 'rejected' ? 'bg-red-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {application.status.replace('_', ' ')}
                    </span>
                    {application.fitScore && (
                      <div className="flex items-center text-yellow-400 text-sm">
                        <Star className="w-4 h-4 mr-1" />
                        {application.fitScore}%
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-400 text-center py-4">No recent applications</p>
            )}
          </div>
        </div>
      </div>

      {/* Certificates Section (for students) */}
      {user?.role === 'student' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Certificates</h2>
            <a href="/certificates" className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center">
              View all
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </a>
          </div>
          
          <div className="space-y-3">
            {recentCertificates.length > 0 ? (
              recentCertificates.map((certificate) => (
                <div key={certificate._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{certificate.jobId?.title}</h3>
                    <p className="text-dark-400 text-sm">{certificate.jobId?.company}</p>
                    <p className="text-dark-500 text-xs">
                      Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      Verified
                    </span>
                    <div className="flex items-center text-yellow-400 text-sm">
                      <Star className="w-4 h-4 mr-1" />
                      {certificate.supervisorFeedback?.rating}/5
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-400 text-center py-4">No certificates yet</p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/jobs"
            className="flex items-center p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200"
          >
            <Briefcase className="w-6 h-6 text-primary-600 mr-3" />
            <div>
              <h3 className="text-white font-medium">Browse Jobs</h3>
              <p className="text-dark-400 text-sm">Find your next opportunity</p>
            </div>
          </a>
          
          <a
            href="/profile"
            className="flex items-center p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200"
          >
            <Users className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-white font-medium">Update Profile</h3>
              <p className="text-dark-400 text-sm">Keep your profile current</p>
            </div>
          </a>
          
          <a
            href="/chat"
            className="flex items-center p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200"
          >
            <Calendar className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <h3 className="text-white font-medium">AI Career Coach</h3>
              <p className="text-dark-400 text-sm">Get personalized advice</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

