import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Briefcase, 
  Star,
  ArrowRight,
  Building
} from 'lucide-react';
import { jobsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Jobs = () => {
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    jobType: '',
    experience: '',
    sortBy: 'relevance'
  });

  const { data: jobsData, isLoading, error } = useQuery(
    ['jobs', filters],
    () => jobsAPI.getJobs(filters),
    {
      keepPreviousData: true
    }
  );

  const jobs = jobsData?.data?.data || [];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      location: '',
      jobType: '',
      experience: '',
      sortBy: 'relevance'
    });
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
        <p className="text-red-400">Error loading jobs. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Job Opportunities</h1>
        <p className="text-dark-400 mt-2">Find your next career opportunity</p>
      </div>

      {/* Search and Filters */}
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
              placeholder="Search jobs by title, company, or keywords..."
              className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                <select
                  name="location"
                  value={filters.location}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Locations</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="bangalore">Bangalore</option>
                  <option value="mumbai">Mumbai</option>
                  <option value="delhi">Delhi</option>
                  <option value="pune">Pune</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-400 mb-2">Job Type</label>
              <select
                name="jobType"
                value={filters.jobType}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-400 mb-2">Experience</label>
              <select
                name="experience"
                value={filters.experience}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Levels</option>
                <option value="entry">Entry Level (0-2 years)</option>
                <option value="mid">Mid Level (2-5 years)</option>
                <option value="senior">Senior Level (5+ years)</option>
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
                <option value="relevance">Relevance</option>
                <option value="date">Date Posted</option>
                <option value="salary">Salary</option>
                <option value="company">Company</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center">
            <button
              onClick={clearFilters}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              Clear all filters
            </button>
            <p className="text-dark-400 text-sm">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <div key={job._id} className="card hover:bg-dark-700 transition-colors duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                        {job.fitScore && (
                          <div className="flex items-center text-yellow-400 text-sm">
                            <Star className="w-4 h-4 mr-1" />
                            {job.fitScore}% match
                          </div>
                        )}
                      </div>
                      
                      <p className="text-primary-600 font-medium mb-1">{job.company}</p>
                      
                      <div className="flex items-center space-x-4 text-dark-400 text-sm mb-3">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          {job.jobType}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {job.experience}
                        </div>
                      </div>
                      
                      <p className="text-dark-300 text-sm mb-3 line-clamp-2">
                        {job.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {job.skills && job.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-dark-700 text-dark-300 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills && job.skills.length > 3 && (
                          <span className="px-2 py-1 bg-dark-700 text-dark-300 rounded text-xs">
                            +{job.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {job.salary ? `₹${job.salary.toLocaleString()}` : 'Salary not specified'}
                    </p>
                    <p className="text-dark-400 text-sm">
                      {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Recently posted'}
                    </p>
                  </div>
                  
                  <Link
                    to={`/jobs/${job._id}`}
                    className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-dark-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-dark-400 mb-4">
              Try adjusting your search criteria or check back later for new opportunities.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
