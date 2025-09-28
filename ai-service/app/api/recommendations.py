from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.core.models import generate_embeddings, search_similar
import numpy as np

router = APIRouter()

class RecommendationRequest(BaseModel):
    studentId: str = Field(..., description="Student ID")
    limit: int = Field(default=10, ge=1, le=50, description="Number of recommendations")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")

class JobRecommendation(BaseModel):
    jobId: str
    title: str
    company: str
    fitScore: float
    reason: str
    location: Optional[str] = None
    jobType: Optional[str] = None
    skills: List[str] = []

class RecommendationResponse(BaseModel):
    recommendations: List[JobRecommendation]
    studentProfile: Optional[Dict[str, Any]] = None
    totalCount: int

# Mock job data for recommendations
MOCK_JOBS = [
    {
        "id": "job_1",
        "title": "Software Developer Intern",
        "company": "Tech Corp",
        "requiredSkills": ["javascript", "react", "node.js"],
        "location": "Bangalore",
        "jobType": "internship",
        "description": "Full-stack development internship"
    },
    {
        "id": "job_2", 
        "title": "Data Science Intern",
        "company": "Data Analytics Inc",
        "requiredSkills": ["python", "machine learning", "pandas"],
        "location": "Mumbai",
        "jobType": "internship",
        "description": "Machine learning and data analysis"
    },
    {
        "id": "job_3",
        "title": "Frontend Developer",
        "company": "Web Solutions",
        "requiredSkills": ["javascript", "react", "css", "html"],
        "location": "Delhi",
        "jobType": "full-time",
        "description": "Frontend development role"
    },
    {
        "id": "job_4",
        "title": "Backend Developer",
        "company": "API Corp",
        "requiredSkills": ["python", "django", "postgresql", "aws"],
        "location": "Hyderabad",
        "jobType": "full-time", 
        "description": "Backend API development"
    }
]

@router.get("/recommendations/{studentId}", response_model=RecommendationResponse)
async def get_job_recommendations(studentId: str, limit: int = 10):
    """
    Get job recommendations for a student
    """
    try:
        # In a real implementation, this would:
        # 1. Fetch student profile from database
        # 2. Generate embeddings for student skills
        # 3. Search for similar jobs using vector similarity
        # 4. Apply additional filters and ranking
        
        # Mock student profile
        mock_profile = {
            "id": studentId,
            "name": "John Doe",
            "skills": ["javascript", "react", "python", "node.js"],
            "department": "Computer Science",
            "year": "4th",
            "gpa": 8.5
        }
        
        # Generate recommendations using mock data
        recommendations = generate_mock_recommendations(mock_profile, limit)
        
        return RecommendationResponse(
            recommendations=recommendations,
            studentProfile=mock_profile,
            totalCount=len(recommendations)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )

@router.post("/recommendations", response_model=RecommendationResponse)
async def get_custom_recommendations(request: RecommendationRequest):
    """
    Get custom job recommendations with filters
    """
    try:
        # Mock implementation
        mock_profile = {
            "id": request.studentId,
            "name": "Student",
            "skills": ["javascript", "python", "react"],
            "department": "Computer Science"
        }
        
        recommendations = generate_mock_recommendations(mock_profile, request.limit)
        
        # Apply filters if provided
        if request.filters:
            recommendations = apply_filters(recommendations, request.filters)
        
        return RecommendationResponse(
            recommendations=recommendations,
            studentProfile=mock_profile,
            totalCount=len(recommendations)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating custom recommendations: {str(e)}"
        )

def generate_mock_recommendations(profile: Dict[str, Any], limit: int) -> List[JobRecommendation]:
    """
    Generate mock job recommendations based on profile
    """
    recommendations = []
    student_skills = set(profile.get("skills", []))
    
    for job in MOCK_JOBS[:limit]:
        job_skills = set(job["requiredSkills"])
        
        # Calculate skill match score
        if job_skills:
            skill_match = len(student_skills.intersection(job_skills)) / len(job_skills)
        else:
            skill_match = 0.0
        
        # Calculate fit score (0-100)
        fit_score = min(100, skill_match * 100)
        
        # Determine reason
        if fit_score >= 80:
            reason = "Excellent skill match"
        elif fit_score >= 60:
            reason = "Good skill match"
        elif fit_score >= 40:
            reason = "Partial skill match"
        else:
            reason = "Limited skill match"
        
        recommendations.append(JobRecommendation(
            jobId=job["id"],
            title=job["title"],
            company=job["company"],
            fitScore=round(fit_score, 1),
            reason=reason,
            location=job.get("location"),
            jobType=job.get("jobType"),
            skills=job["requiredSkills"]
        ))
    
    # Sort by fit score (descending)
    recommendations.sort(key=lambda x: x.fitScore, reverse=True)
    
    return recommendations

def apply_filters(recommendations: List[JobRecommendation], filters: Dict[str, Any]) -> List[JobRecommendation]:
    """
    Apply filters to recommendations
    """
    filtered = recommendations
    
    # Filter by job type
    if "jobType" in filters:
        job_type = filters["jobType"]
        filtered = [r for r in filtered if r.jobType == job_type]
    
    # Filter by location
    if "location" in filters:
        location = filters["location"].lower()
        filtered = [r for r in filtered if r.location and location in r.location.lower()]
    
    # Filter by minimum fit score
    if "minFitScore" in filters:
        min_score = filters["minFitScore"]
        filtered = [r for r in filtered if r.fitScore >= min_score]
    
    return filtered

