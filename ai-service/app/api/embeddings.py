from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
from app.core.models import generate_embeddings, add_to_faiss_index

router = APIRouter()

class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=10000, description="Text to generate embeddings for")
    type: str = Field(default="document", description="Type of text (resume, job, document)")

class EmbeddingResponse(BaseModel):
    embeddings: List[float]
    dimension: int
    type: str

class BatchEmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=100, description="List of texts to embed")
    type: str = Field(default="document", description="Type of texts")

class BatchEmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int
    count: int

@router.post("/embeddings", response_model=EmbeddingResponse)
async def generate_text_embeddings(request: EmbeddingRequest):
    """
    Generate embeddings for a single text
    """
    try:
        # Generate embeddings
        embeddings_array = generate_embeddings([request.text])
        
        if embeddings_array is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to generate embeddings"
            )
        
        embeddings = embeddings_array[0].tolist()
        dimension = len(embeddings)
        
        return EmbeddingResponse(
            embeddings=embeddings,
            dimension=dimension,
            type=request.type
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating embeddings: {str(e)}"
        )

@router.post("/embeddings/batch", response_model=BatchEmbeddingResponse)
async def generate_batch_embeddings(request: BatchEmbeddingRequest):
    """
    Generate embeddings for multiple texts
    """
    try:
        # Generate embeddings
        embeddings_array = generate_embeddings(request.texts)
        
        if embeddings_array is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to generate embeddings"
            )
        
        embeddings = [emb.tolist() for emb in embeddings_array]
        dimension = len(embeddings[0]) if embeddings else 0
        
        return BatchEmbeddingResponse(
            embeddings=embeddings,
            dimension=dimension,
            count=len(embeddings)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating batch embeddings: {str(e)}"
        )

@router.post("/embeddings/store")
async def store_embeddings(request: BatchEmbeddingRequest):
    """
    Generate and store embeddings in vector database
    """
    try:
        # Generate embeddings
        embeddings_array = generate_embeddings(request.texts)
        
        if embeddings_array is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to generate embeddings"
            )
        
        # Store in FAISS index
        success = add_to_faiss_index(embeddings_array)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to store embeddings"
            )
        
        return {
            "success": True,
            "message": f"Stored {len(embeddings_array)} embeddings",
            "count": len(embeddings_array)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error storing embeddings: {str(e)}"
        )

