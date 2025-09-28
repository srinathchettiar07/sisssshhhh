import os
import torch
import logging
from typing import Optional, List, Dict, Any
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import faiss
import numpy as np
from app.core.config import settings

logger = logging.getLogger(__name__)

# Global model instances
_embedding_model = None
_chat_model = None
_faiss_index = None

def get_embedding_model() -> Optional[SentenceTransformer]:
    """Get or initialize the embedding model"""
    global _embedding_model
    
    if _embedding_model is None:
        try:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            _embedding_model = SentenceTransformer(
                settings.EMBEDDING_MODEL,
                cache_folder=settings.HF_MODEL_CACHE_DIR
            )
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            return None
    
    return _embedding_model

def get_chat_model():
    """Get or initialize the chat model"""
    global _chat_model
    
    if _chat_model is None:
        try:
            if settings.MODEL_MODE == "hf_api":
                # Use Hugging Face API
                _chat_model = "hf_api"
                logger.info("Using Hugging Face API for chat model")
            else:
                # Load local model
                logger.info(f"Loading chat model: {settings.CHAT_MODEL}")
                tokenizer = AutoTokenizer.from_pretrained(
                    settings.CHAT_MODEL,
                    cache_dir=settings.HF_MODEL_CACHE_DIR
                )
                model = AutoModelForCausalLM.from_pretrained(
                    settings.CHAT_MODEL,
                    cache_dir=settings.HF_MODEL_CACHE_DIR,
                    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
                )
                
                _chat_model = pipeline(
                    "text-generation",
                    model=model,
                    tokenizer=tokenizer,
                    max_length=settings.MAX_TOKENS,
                    temperature=settings.TEMPERATURE,
                    do_sample=True
                )
                logger.info("Chat model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load chat model: {e}")
            return None
    
    return _chat_model

def get_faiss_index() -> Optional[faiss.Index]:
    """Get or initialize the FAISS index"""
    global _faiss_index
    
    if _faiss_index is None:
        try:
            if os.path.exists(settings.FAISS_INDEX_PATH):
                logger.info("Loading existing FAISS index")
                _faiss_index = faiss.read_index(settings.FAISS_INDEX_PATH)
            else:
                logger.info("Creating new FAISS index")
                # Get embedding dimension from model
                embedding_model = get_embedding_model()
                if embedding_model:
                    # Create a dummy embedding to get dimension
                    dummy_embedding = embedding_model.encode(["dummy"])
                    dimension = len(dummy_embedding[0])
                    _faiss_index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
                else:
                    # Default dimension for all-MiniLM-L6-v2
                    dimension = 384
                    _faiss_index = faiss.IndexFlatIP(dimension)
                
                # Save the index
                os.makedirs(os.path.dirname(settings.FAISS_INDEX_PATH), exist_ok=True)
                faiss.write_index(_faiss_index, settings.FAISS_INDEX_PATH)
            
            logger.info("FAISS index loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {e}")
            return None
    
    return _faiss_index

def generate_embeddings(texts: List[str]) -> Optional[np.ndarray]:
    """Generate embeddings for a list of texts"""
    try:
        embedding_model = get_embedding_model()
        if not embedding_model:
            return None
        
        embeddings = embedding_model.encode(texts, convert_to_numpy=True)
        return embeddings
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        return None

def add_to_faiss_index(embeddings: np.ndarray, metadata: List[Dict[str, Any]] = None):
    """Add embeddings to FAISS index"""
    try:
        faiss_index = get_faiss_index()
        if faiss_index is None:
            return False
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Add to index
        faiss_index.add(embeddings)
        
        # Save updated index
        faiss.write_index(faiss_index, settings.FAISS_INDEX_PATH)
        
        logger.info(f"Added {len(embeddings)} embeddings to FAISS index")
        return True
    except Exception as e:
        logger.error(f"Failed to add to FAISS index: {e}")
        return False

def search_similar(query_embedding: np.ndarray, k: int = 5) -> tuple:
    """Search for similar embeddings in FAISS index"""
    try:
        faiss_index = get_faiss_index()
        if faiss_index is None:
            return None, None
        
        # Normalize query embedding
        faiss.normalize_L2(query_embedding.reshape(1, -1))
        
        # Search
        scores, indices = faiss_index.search(query_embedding.reshape(1, -1), k)
        
        return scores[0], indices[0]
    except Exception as e:
        logger.error(f"Failed to search FAISS index: {e}")
        return None, None

def generate_chat_response(message: str, context: str = "", user_profile: Dict[str, Any] = None) -> str:
    """Generate a chat response using the chat model"""
    try:
        chat_model = get_chat_model()
        if not chat_model:
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
        
        if settings.MODEL_MODE == "hf_api":
            # Use Hugging Face API
            return generate_hf_api_response(message, context, user_profile)
        else:
            # Use local model
            return generate_local_response(message, context, user_profile)
    except Exception as e:
        logger.error(f"Failed to generate chat response: {e}")
        return "I'm sorry, I encountered an error while processing your request."

def generate_hf_api_response(message: str, context: str = "", user_profile: Dict[str, Any] = None) -> str:
    """Generate response using Hugging Face API"""
    # This would integrate with Hugging Face Inference API
    # For now, return a mock response
    return f"I understand you're asking about: {message}. Based on your profile, I can help you with career guidance and placement-related questions."

def generate_local_response(message: str, context: str = "", user_profile: Dict[str, Any] = None) -> str:
    """Generate response using local model"""
    try:
        # Build prompt with context
        prompt = build_chat_prompt(message, context, user_profile)
        
        # Generate response
        response = chat_model(
            prompt,
            max_length=len(prompt.split()) + settings.MAX_TOKENS,
            num_return_sequences=1,
            temperature=settings.TEMPERATURE,
            do_sample=True,
            pad_token_id=chat_model.tokenizer.eos_token_id
        )
        
        # Extract generated text
        generated_text = response[0]['generated_text']
        response_text = generated_text[len(prompt):].strip()
        
        return response_text if response_text else "I understand your question. How can I help you further?"
    except Exception as e:
        logger.error(f"Failed to generate local response: {e}")
        return "I'm here to help with your career questions. What would you like to know?"

def build_chat_prompt(message: str, context: str = "", user_profile: Dict[str, Any] = None) -> str:
    """Build a prompt for the chat model"""
    prompt_parts = [
        "You are an AI career coach for a campus placement platform. Help students with career guidance, resume tips, interview preparation, and job search advice.",
        ""
    ]
    
    if user_profile:
        prompt_parts.extend([
            f"Student Profile:",
            f"- Name: {user_profile.get('name', 'N/A')}",
            f"- Department: {user_profile.get('department', 'N/A')}",
            f"- Year: {user_profile.get('year', 'N/A')}",
            f"- Skills: {', '.join(user_profile.get('skills', []))}",
            ""
        ])
    
    if context:
        prompt_parts.append(f"Context: {context}")
    
    prompt_parts.extend([
        f"Student Question: {message}",
        "AI Response:"
    ])
    
    return "\n".join(prompt_parts)

def cleanup_models():
    """Cleanup model instances"""
    global _embedding_model, _chat_model, _faiss_index
    
    _embedding_model = None
    _chat_model = None
    _faiss_index = None
    
    # Clear CUDA cache if available
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    logger.info("Models cleaned up")

