from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.core.models import generate_chat_response, generate_embeddings, search_similar
import numpy as np

router = APIRouter()

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User message")
    context: Optional[str] = Field(None, max_length=2000, description="Additional context")
    fileUrl: Optional[str] = Field(None, description="URL of uploaded file")
    userId: Optional[str] = Field(None, description="User ID for personalization")
    userProfile: Optional[Dict[str, Any]] = Field(None, description="User profile information")

class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    suggestions: List[str]

class ChatHistoryRequest(BaseModel):
    userId: str = Field(..., description="User ID")
    limit: int = Field(default=10, ge=1, le=50, description="Number of messages to retrieve")

class ChatHistoryResponse(BaseModel):
    messages: List[Dict[str, Any]]
    count: int

# Mock knowledge base for RAG
KNOWLEDGE_BASE = [
    {
        "id": "resume_tips_1",
        "content": "A good resume should be 1-2 pages long, use clear formatting, and highlight relevant skills and experience.",
        "type": "resume_tips",
        "title": "Resume Length and Formatting"
    },
    {
        "id": "interview_prep_1", 
        "content": "Prepare for interviews by researching the company, practicing common questions, and preparing examples of your achievements.",
        "type": "interview_prep",
        "title": "Interview Preparation"
    },
    {
        "id": "skill_development_1",
        "content": "Focus on developing both technical skills (programming, tools) and soft skills (communication, teamwork) for career success.",
        "type": "skill_development", 
        "title": "Skill Development"
    },
    {
        "id": "placement_process_1",
        "content": "The placement process typically involves: application submission, resume screening, technical tests, interviews, and final selection.",
        "type": "placement_process",
        "title": "Placement Process Overview"
    },
    {
        "id": "career_guidance_1",
        "content": "Choose your career path based on your interests, skills, market demand, and long-term goals. Consider internships to explore different fields.",
        "type": "career_guidance",
        "title": "Career Path Selection"
    }
]

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Chat with AI career coach using RAG
    """
    try:
        # Generate embedding for the user message
        message_embedding = generate_embeddings([request.message])
        
        if message_embedding is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to process message"
            )
        
        # Search for relevant knowledge
        sources = []
        if len(message_embedding) > 0:
            # For demo purposes, we'll use a simple similarity search
            # In production, this would search a proper vector database
            sources = search_knowledge_base(request.message)
        
        # Build context from sources
        context = ""
        if sources:
            context = "\n".join([source["content"] for source in sources])
        
        # Generate response
        response = generate_chat_response(
            message=request.message,
            context=context,
            user_profile=request.userProfile
        )
        
        # Generate suggestions based on the message
        suggestions = generate_suggestions(request.message, request.userProfile)
        
        return ChatResponse(
            response=response,
            sources=sources,
            suggestions=suggestions
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat request: {str(e)}"
        )

@router.post("/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(request: ChatHistoryRequest):
    """
    Get chat history for a user (mock implementation)
    """
    try:
        # In a real implementation, this would fetch from a database
        # For now, return mock data
        mock_messages = [
            {
                "id": "msg_1",
                "message": "How can I improve my resume?",
                "response": "Focus on highlighting relevant skills and achievements...",
                "timestamp": "2024-01-15T10:30:00Z",
                "type": "user"
            },
            {
                "id": "msg_2", 
                "message": "What should I prepare for technical interviews?",
                "response": "Practice coding problems, review data structures...",
                "timestamp": "2024-01-15T10:35:00Z",
                "type": "user"
            }
        ]
        
        return ChatHistoryResponse(
            messages=mock_messages[:request.limit],
            count=len(mock_messages)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving chat history: {str(e)}"
        )

def search_knowledge_base(query: str) -> List[Dict[str, Any]]:
    """
    Search the knowledge base for relevant information
    """
    # Simple keyword-based search for demo
    # In production, this would use proper vector similarity search
    query_lower = query.lower()
    relevant_sources = []
    
    for item in KNOWLEDGE_BASE:
        # Check if query keywords match content
        content_lower = item["content"].lower()
        if any(keyword in content_lower for keyword in query_lower.split()):
            relevant_sources.append({
                "id": item["id"],
                "title": item["title"],
                "content": item["content"],
                "type": item["type"],
                "relevance_score": 0.8  # Mock score
            })
    
    # Return top 3 most relevant sources
    return relevant_sources[:3]

def generate_suggestions(message: str, user_profile: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Generate follow-up suggestions based on the message
    """
    suggestions = []
    message_lower = message.lower()
    
    if "resume" in message_lower:
        suggestions.extend([
            "How to format my resume?",
            "What skills should I highlight?",
            "Resume length guidelines"
        ])
    elif "interview" in message_lower:
        suggestions.extend([
            "Common interview questions",
            "How to prepare for technical interviews?",
            "Interview etiquette tips"
        ])
    elif "skill" in message_lower:
        suggestions.extend([
            "In-demand technical skills",
            "How to develop soft skills?",
            "Skill assessment tools"
        ])
    else:
        suggestions.extend([
            "Resume writing tips",
            "Interview preparation",
            "Career guidance"
        ])
    
    return suggestions[:3]  # Return top 3 suggestions

