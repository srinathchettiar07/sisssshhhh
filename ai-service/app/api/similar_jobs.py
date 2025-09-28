from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.core.models import generate_embeddings, search_similar
import numpy as np

router = APIRouter()

class SimilarJobsRequest(BaseModel):
    jobId: str = Field(..., description="Reference job ID")
    limit: int = Field(default=5, ge=1, le=20, description="Number of similar jobs to return")

class SimilarJob(BaseModel):
    jobId: str
    title: str
    company: str
    similarityScore: float
    reason: str
    location: Optional[str] = None
    jobType: Optional[str] = None

class SimilarJobsResponse(BaseModel):
    referenceJob: Dict[str, Any]
    similarJobs: List[SimilarJob]
    totalCount: int

# Mock job database
MOCK_JOBS_DB = [
    {
        "id": "job_1",
        "title": "Software Developer Intern",
        "company": "Tech Corp",
        "description": "Full-stack development internship with React and Node.js",
        "requiredSkills": ["javascript", "react", "node.js", "mongodb"],
        "location": "Bangalore",
        "jobType": "internship"
    },
    {
        "id": "job_2",
        "title": "Frontend Developer",
        "company": "Web Solutions",
        "description": "Frontend development role focusing on React and modern web technologies",
        "requiredSkills": ["javascript", "react", "html", "css"],
        "location": "Delhi",
        "jobType": "full-time"
    },
    {
        "id": "job_3",
        "title": "Backend Developer",
        "company": "API Corp",
        "description": "Backend API development using Python and Django",
        "requiredSkills": ["python", "django", "postgresql", "aws"],
        "location": "Hyderabad",
        "jobType": "full-time"
    },
    {
        "id": "job_4",
        "title": "Full Stack Developer",
        "company": "StartupXYZ",
        "description": "Full-stack development with modern technologies",
        "requiredSkills": ["javascript", "react", "node.js", "python", "mongodb"],
        "location": "Mumbai",
        "jobType": "internship"
    },
    {
        "id": "job_5",
        "title": "React Developer",
        "company": "UI Company",
        "description": "React development for web applications",
        "requiredSkills": ["javascript", "react", "redux", "typescript"],
        "location": "Pune",
        "jobType": "full-time"
    }
]

@router.post("/similar-jobs", response_model=SimilarJobsResponse)
async def find_similar_jobs(request: SimilarJobsRequest):
    """
    Find jobs similar to the reference job
    """
    try:
        # Find reference job
        reference_job = None
        for job in MOCK_JOBS_DB:
            if job["id"] == request.jobId:
                reference_job = job
                break
        
        if not reference_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reference job not found"
            )
        
        # Generate embeddings for reference job
        reference_text = f"{reference_job['title']} {reference_job['description']} {' '.join(reference_job['requiredSkills'])}"
        reference_embedding = generate_embeddings([reference_text])
        
        if reference_embedding is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to generate embeddings"
            )
        
        # Find similar jobs
        similar_jobs = find_similar_jobs_by_embedding(
            reference_job, 
            reference_embedding[0], 
            request.limit
        )
        
        return SimilarJobsResponse(
            referenceJob=reference_job,
            similarJobs=similar_jobs,
            totalCount=len(similar_jobs)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error finding similar jobs: {str(e)}"
        )

def find_similar_jobs_by_embedding(reference_job: Dict[str, Any], reference_embedding: np.ndarray, limit: int) -> List[SimilarJob]:
    """
    Find similar jobs using embedding similarity
    """
    similar_jobs = []
    
    for job in MOCK_JOBS_DB:
        if job["id"] == reference_job["id"]:
            continue  # Skip the reference job itself
        
        # Generate embedding for this job
        job_text = f"{job['title']} {job['description']} {' '.join(job['requiredSkills'])}"
        job_embedding = generate_embeddings([job_text])
        
        if job_embedding is None:
            continue
        
        # Calculate cosine similarity
        similarity_score = calculate_cosine_similarity(reference_embedding, job_embedding[0])
        
        # Determine reason for similarity
        reason = determine_similarity_reason(reference_job, job, similarity_score)
        
        similar_jobs.append(SimilarJob(
            jobId=job["id"],
            title=job["title"],
            company=job["company"],
            similarityScore=round(similarity_score, 3),
            reason=reason,
            location=job.get("location"),
            jobType=job.get("jobType")
        ))
    
    # Sort by similarity score (descending)
    similar_jobs.sort(key=lambda x: x.similarityScore, reverse=True)
    
    return similar_jobs[:limit]

def calculate_cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Calculate cosine similarity between two embeddings
    """
    try:
        # Normalize embeddings
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Calculate cosine similarity
        similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
        return float(similarity)
    
    except Exception:
        return 0.0

def determine_similarity_reason(reference_job: Dict[str, Any], job: Dict[str, Any], similarity_score: float) -> str:
    """
    Determine the reason for job similarity
    """
    reasons = []
    
    # Check for skill overlap
    ref_skills = set(reference_job.get("requiredSkills", []))
    job_skills = set(job.get("requiredSkills", []))
    skill_overlap = len(ref_skills.intersection(job_skills))
    
    if skill_overlap > 0:
        reasons.append(f"Shared {skill_overlap} skills")
    
    # Check for similar job type
    if reference_job.get("jobType") == job.get("jobType"):
        reasons.append("Same job type")
    
    # Check for similar title keywords
    ref_title_words = set(reference_job.get("title", "").lower().split())
    job_title_words = set(job.get("title", "").lower().split())
    title_overlap = len(ref_title_words.intersection(job_title_words))
    
    if title_overlap > 0:
        reasons.append(f"Similar title ({title_overlap} common words)")
    
    # Check similarity score ranges
    if similarity_score >= 0.8:
        reasons.append("Very high similarity")
    elif similarity_score >= 0.6:
        reasons.append("High similarity")
    elif similarity_score >= 0.4:
        reasons.append("Moderate similarity")
    else:
        reasons.append("Low similarity")
    
    return ", ".join(reasons) if reasons else "Basic similarity"

