from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from dotenv import load_dotenv
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ai-service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import API routes
from app.api import embeddings, chat, recommendations, resume_parse, certificates, similar_jobs

# Create FastAPI app
app = FastAPI(
    title="Campus AI-Placement AI Service",
    description="AI-powered services for campus placement platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.localhost"]
)

# Include API routes
app.include_router(embeddings.router, prefix="/api/ai", tags=["Embeddings"])
app.include_router(chat.router, prefix="/api/ai", tags=["Chat"])
app.include_router(recommendations.router, prefix="/api/ai", tags=["Recommendations"])
app.include_router(resume_parse.router, prefix="/api/ai", tags=["Resume Parse"])
app.include_router(certificates.router, prefix="/api/ai", tags=["Certificates"])
app.include_router(similar_jobs.router, prefix="/api/ai", tags=["Similar Jobs"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Campus AI-Placement AI Service",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if AI models are loaded
        from app.core.models import get_embedding_model, get_chat_model
        
        embedding_model = get_embedding_model()
        chat_model = get_chat_model()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "models": {
                "embedding": "loaded" if embedding_model else "not_loaded",
                "chat": "loaded" if chat_model else "not_loaded"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        )

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    # Create necessary directories
    os.makedirs("data", exist_ok=True)
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    os.makedirs("templates", exist_ok=True)
    
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("PYTHON_ENV") == "development",
        log_level="info"
    )

