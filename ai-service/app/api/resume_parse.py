from fastapi import APIRouter, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import PyPDF2
import docx
import re
import os
from app.core.models import generate_embeddings

router = APIRouter()

class ResumeParseRequest(BaseModel):
    resumeUrl: str = Field(..., description="URL of the resume file")
    userId: Optional[str] = Field(None, description="User ID")

class ParsedResume(BaseModel):
    skills: List[str]
    projects: List[Dict[str, Any]]
    experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    summary: str
    contact: Optional[Dict[str, str]] = None

class ResumeParseResponse(BaseModel):
    success: bool
    data: ParsedResume
    message: str

@router.post("/resume-parse", response_model=ResumeParseResponse)
async def parse_resume(request: ResumeParseRequest):
    """
    Parse resume and extract structured information
    """
    try:
        # In a real implementation, this would:
        # 1. Download the file from the URL
        # 2. Extract text based on file type (PDF, DOC, etc.)
        # 3. Use NLP to extract structured information
        # 4. Return parsed data
        
        # Mock implementation for demo
        parsed_data = parse_resume_mock(request.resumeUrl)
        
        return ResumeParseResponse(
            success=True,
            data=parsed_data,
            message="Resume parsed successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing resume: {str(e)}"
        )

@router.post("/resume-parse/upload")
async def parse_uploaded_resume(file: UploadFile = File(...)):
    """
    Parse uploaded resume file
    """
    try:
        # Check file type
        if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF, DOC, and DOCX files are supported"
            )
        
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        text = extract_text_from_file(content, file.filename)
        
        # Parse the text
        parsed_data = parse_text_content(text)
        
        return ResumeParseResponse(
            success=True,
            data=parsed_data,
            message="Resume parsed successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing uploaded resume: {str(e)}"
        )

def parse_resume_mock(resume_url: str) -> ParsedResume:
    """
    Mock resume parsing for demo purposes
    """
    # Mock parsed data based on common resume patterns
    return ParsedResume(
        skills=[
            "JavaScript", "Python", "React", "Node.js", "MongoDB",
            "HTML", "CSS", "Git", "AWS", "Docker"
        ],
        projects=[
            {
                "title": "E-commerce Website",
                "description": "Built a full-stack e-commerce platform using React and Node.js",
                "technologies": ["React", "Node.js", "MongoDB", "Stripe"],
                "duration": "3 months",
                "link": "https://github.com/user/ecommerce"
            },
            {
                "title": "Task Management App",
                "description": "Developed a cross-platform task management application",
                "technologies": ["React Native", "Firebase", "JavaScript"],
                "duration": "2 months",
                "link": "https://github.com/user/taskapp"
            }
        ],
        experience=[
            {
                "company": "Tech Startup",
                "position": "Software Developer Intern",
                "duration": "6 months",
                "description": "Developed web applications and worked on backend APIs",
                "skills": ["JavaScript", "Python", "React", "Django"]
            }
        ],
        education=[
            {
                "institution": "University of Technology",
                "degree": "Bachelor of Technology",
                "field": "Computer Science",
                "year": "2020-2024",
                "gpa": "8.5/10"
            }
        ],
        summary="Computer Science student with strong programming skills and experience in full-stack development. Passionate about creating innovative solutions and learning new technologies.",
        contact={
            "email": "student@university.edu",
            "phone": "+91-9876543210",
            "linkedin": "https://linkedin.com/in/student",
            "github": "https://github.com/student"
        }
    )

def extract_text_from_file(content: bytes, filename: str) -> str:
    """
    Extract text from uploaded file based on file type
    """
    try:
        if filename.lower().endswith('.pdf'):
            return extract_text_from_pdf(content)
        elif filename.lower().endswith(('.doc', '.docx')):
            return extract_text_from_docx(content)
        else:
            raise ValueError("Unsupported file type")
    except Exception as e:
        raise ValueError(f"Error extracting text: {str(e)}")

def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract text from PDF file
    """
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise ValueError(f"Error reading PDF: {str(e)}")

def extract_text_from_docx(content: bytes) -> str:
    """
    Extract text from DOCX file
    """
    try:
        doc = docx.Document(io.BytesIO(content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        raise ValueError(f"Error reading DOCX: {str(e)}")

def parse_text_content(text: str) -> ParsedResume:
    """
    Parse text content to extract structured information
    """
    # This is a simplified parser - in production, you'd use more sophisticated NLP
    skills = extract_skills(text)
    projects = extract_projects(text)
    experience = extract_experience(text)
    education = extract_education(text)
    summary = extract_summary(text)
    contact = extract_contact(text)
    
    return ParsedResume(
        skills=skills,
        projects=projects,
        experience=experience,
        education=education,
        summary=summary,
        contact=contact
    )

def extract_skills(text: str) -> List[str]:
    """
    Extract skills from resume text
    """
    # Common technical skills
    skill_keywords = [
        "JavaScript", "Python", "Java", "C++", "React", "Angular", "Vue",
        "Node.js", "Express", "Django", "Flask", "Spring", "MongoDB",
        "PostgreSQL", "MySQL", "Redis", "AWS", "Docker", "Kubernetes",
        "Git", "Linux", "HTML", "CSS", "Bootstrap", "jQuery"
    ]
    
    found_skills = []
    text_lower = text.lower()
    
    for skill in skill_keywords:
        if skill.lower() in text_lower:
            found_skills.append(skill)
    
    return found_skills

def extract_projects(text: str) -> List[Dict[str, Any]]:
    """
    Extract project information from resume text
    """
    # Simple regex-based extraction
    projects = []
    
    # Look for project patterns
    project_patterns = [
        r"Project:\s*(.+?)(?:\n|$)",
        r"Developed\s+(.+?)(?:\n|$)",
        r"Built\s+(.+?)(?:\n|$)"
    ]
    
    for pattern in project_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            projects.append({
                "title": match.strip(),
                "description": match.strip(),
                "technologies": [],
                "duration": "",
                "link": ""
            })
    
    return projects[:5]  # Limit to 5 projects

def extract_experience(text: str) -> List[Dict[str, Any]]:
    """
    Extract work experience from resume text
    """
    experience = []
    
    # Look for experience patterns
    exp_patterns = [
        r"(.+?)\s*-\s*(.+?)\s*-\s*(.+?)(?:\n|$)",
        r"Worked at\s+(.+?)(?:\n|$)",
        r"Intern at\s+(.+?)(?:\n|$)"
    ]
    
    for pattern in exp_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            if len(match) >= 3:
                experience.append({
                    "company": match[0].strip(),
                    "position": match[1].strip(),
                    "duration": match[2].strip(),
                    "description": "",
                    "skills": []
                })
    
    return experience[:3]  # Limit to 3 experiences

def extract_education(text: str) -> List[Dict[str, Any]]:
    """
    Extract education information from resume text
    """
    education = []
    
    # Look for education patterns
    edu_patterns = [
        r"(.+?)\s*-\s*(.+?)\s*-\s*(.+?)(?:\n|$)",
        r"Bachelor.*?in\s+(.+?)(?:\n|$)",
        r"Master.*?in\s+(.+?)(?:\n|$)"
    ]
    
    for pattern in edu_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            if len(match) >= 3:
                education.append({
                    "institution": match[0].strip(),
                    "degree": match[1].strip(),
                    "field": match[2].strip(),
                    "year": "",
                    "gpa": ""
                })
    
    return education[:2]  # Limit to 2 education entries

def extract_summary(text: str) -> str:
    """
    Extract summary/objective from resume text
    """
    # Look for summary patterns
    summary_patterns = [
        r"Summary:\s*(.+?)(?:\n\n|$)",
        r"Objective:\s*(.+?)(?:\n\n|$)",
        r"About:\s*(.+?)(?:\n\n|$)"
    ]
    
    for pattern in summary_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()
    
    return "Experienced professional with strong technical skills and passion for innovation."

def extract_contact(text: str) -> Dict[str, str]:
    """
    Extract contact information from resume text
    """
    contact = {}
    
    # Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        contact["email"] = email_match.group()
    
    # Phone
    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    if phone_match:
        contact["phone"] = phone_match.group()
    
    # LinkedIn
    linkedin_match = re.search(r'linkedin\.com/in/[\w-]+', text, re.IGNORECASE)
    if linkedin_match:
        contact["linkedin"] = "https://" + linkedin_match.group()
    
    # GitHub
    github_match = re.search(r'github\.com/[\w-]+', text, re.IGNORECASE)
    if github_match:
        contact["github"] = "https://" + github_match.group()
    
    return contact

