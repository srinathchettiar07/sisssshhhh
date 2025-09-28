import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  FileText, 
  Calendar, 
  Star, 
  Eye, 
  Download,
  Filter,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { applicationsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const Applications = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sortBy: 'date'
  });

  const { data: applicationsData, isLoading, error } = useQuery(
    ['applications', filters],
    () => applicationsAPI.getApplications(filters),
    {
      keepPreviousData: true
    }
  );

  const applications = applicationsData?.data?.data || [];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'applied':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'shortlisted':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'interview_scheduled':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-dark-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-600 text-white';
      case 'shortlisted':
        return 'bg-green-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'interview_scheduled':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-dark-600 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error loading applications. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Applications</h1>
        <p className="text-dark-400 mt-2">Track your job applications and their status</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search applications by job title or company..."
              className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-2">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview_scheduled">Interview Scheduled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-400 mb-2">Sort By</label>
              <select
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date">Date Applied</option>
                <option value="status">Status</option>
                <option value="company">Company</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex justify-between items-center">
            <p className="text-dark-400 text-sm">
              {applications.length} application{applications.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.length > 0 ? (
          applications.map((application) => (
            <div key={application._id} className="card hover:bg-dark-700 transition-colors duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {application.jobId?.title || 'Job Title Not Available'}
                      </h3>
                      {application.fitScore && (
                        <div className="flex items-center text-yellow-400 text-sm">
                          <Star className="w-4 h-4 mr-1" />
                          {application.fitScore}% match
                        </div>
                      )}
                    </div>
                    
                    <p className="text-primary-600 font-medium mb-2">
                      {application.jobId?.company || 'Company Not Available'}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-dark-400 text-sm mb-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Applied {new Date(application.appliedAt).toLocaleDateString()}
                      </div>
                      {application.jobId?.location && (
                        <div className="flex items-center">
                          <span>{application.jobId.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {application.coverLetter && (
                      <p className="text-dark-300 text-sm mb-3 line-clamp-2">
                        {application.coverLetter}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center px-2 py-1 rounded text-xs ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1 capitalize">{application.status.replace('_', ' ')}</span>
                      </div>
                      
                      {application.status === 'interview_scheduled' && application.interviewDate && (
                        <div className="flex items-center text-yellow-400 text-sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          Interview: {new Date(application.interviewDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="text-right">
                    <p className="text-dark-400 text-sm">
                      {application.jobId?.jobType || 'Full Time'}
                    </p>
                    {application.jobId?.salary && (
                      <p className="text-white font-semibold">
                        ₹{application.jobId.salary.toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200">
                      <Eye className="w-4 h-4 text-dark-400" />
                    </button>
                    <button className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200">
                      <Download className="w-4 h-4 text-dark-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-dark-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No applications found</h3>
            <p className="text-dark-400 mb-4">
              {filters.search || filters.status 
                ? 'Try adjusting your search criteria.' 
                : 'You haven\'t applied to any jobs yet. Start by browsing available opportunities.'
              }
            </p>
            {!filters.search && !filters.status && (
              <a
                href="/jobs"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
              >
                Browse Jobs
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Applications;
