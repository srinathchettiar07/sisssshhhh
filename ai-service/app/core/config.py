import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Environment
    PYTHON_ENV = os.getenv("PYTHON_ENV", "development")
    PORT = int(os.getenv("PORT", 8000))
    
    # Database
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/campus-placement")
    
    # Hugging Face
    HF_API_TOKEN = os.getenv("HF_API_TOKEN")
    HF_MODEL_CACHE_DIR = os.getenv("HF_MODEL_CACHE_DIR", "./models")
    
    # Vector Database
    FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "./data/faiss_index")
    VECTOR_DB_TYPE = os.getenv("VECTOR_DB_TYPE", "faiss")
    
    # AI Models
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    LLM_MODEL = os.getenv("LLM_MODEL", "microsoft/DialoGPT-medium")
    CHAT_MODEL = os.getenv("CHAT_MODEL", "microsoft/DialoGPT-medium")
    
    # Model Configuration
    MODEL_MODE = os.getenv("MODEL_MODE", "local")  # local or hf_api
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", 512))
    TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))
    
    # File Storage
    UPLOAD_PATH = os.getenv("UPLOAD_PATH", "./uploads")
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 10485760))  # 10MB
    
    # Certificate Generation
    CERTIFICATE_TEMPLATE_PATH = os.getenv("CERTIFICATE_TEMPLATE_PATH", "./templates/certificate.html")
    QR_CODE_SIZE = int(os.getenv("QR_CODE_SIZE", 200))
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", 60))
    RATE_LIMIT_BURST = int(os.getenv("RATE_LIMIT_BURST", 10))
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "./logs/ai-service.log")

settings = Settings()

