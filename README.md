# Campus AI-Placement (CAP)

An AI-powered, campus-centric placement platform that combines automated matching, mentor approvals, interview scheduling, and a RAG-powered chatbot career coach — privacy-first, cost-aware, and optimized for campus infrastructure.

## 🚀 Features

- **AI Career Coach**: Personalized resume reviews, role-fit explanations, and interview preparation using RAG
- **Agentic Automations**: Automated workflows for scheduling, approvals, and follow-ups
- **Verifiable Certificates**: Tamper-evident certificates with hash verification
- **Privacy-First**: Local deployment with open-source models and on-campus data storage

## 🏗️ Architecture

```
Frontend (React/JS + Tailwind) ←→ Backend (Node.js/Express/JS) ←→ Python AI Service (FastAPI)
                                        ↓
                                   MongoDB + Vector DB (FAISS)
```

## 📋 Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB 5.0+
- Redis (optional, for background jobs)

## 🛠️ Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install Python AI service dependencies
cd ../ai-service
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Copy the example environment files and configure:

```bash
# Backend
cp backend/env.example backend/.env

# Python AI Service
cp ai-service/env.example ai-service/.env

# Frontend (optional)
cp frontend/.env.example frontend/.env
```

### 3. Start Services

```bash
# Terminal 1: Start MongoDB and Redis
docker-compose up -d mongodb redis

# Terminal 2: Start Backend API
cd backend
npm run dev

# Terminal 3: Start Python AI Service
cd ai-service
python main.py

# Terminal 4: Start Frontend
cd frontend
npm start
```

## 🔧 Configuration

### Model Configuration

The system supports multiple model configurations:

**Development (Local Models)**:
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2`
- LLM: Mock responses or small local models

**Production (Hugging Face API)**:
- Set `HF_API_TOKEN` in environment
- Models will automatically switch to HF Inference API

### Environment Variables

#### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus-placement
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://localhost:6379
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

#### Python AI Service (.env)
```
HF_API_TOKEN=your-huggingface-token
VECTOR_DB_PATH=./data/faiss_index
MODEL_CACHE_DIR=./models
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Python AI service tests
cd ai-service
pytest

# Frontend tests
cd frontend
npm test
```

## 📊 API Documentation

- Backend API: http://localhost:5000/api-docs
- Python AI Service: http://localhost:8000/docs

## 🎯 Demo Scenarios

1. **Student Application Flow**: Student applies → Mentor approval → Interview scheduling
2. **AI-Powered Matching**: Resume analysis → Job recommendations → Fit scoring
3. **RAG Chatbot**: Career guidance with document references
4. **Certificate Generation**: PDF generation with tamper-evident hashing

## 🔒 Security & Privacy

- RBAC (Role-Based Access Control) for all endpoints
- PII minimization in initial views
- Encrypted file storage
- Audit logging for compliance
- GDPR-like data export/deletion

## 📈 Performance

- Embedding caching to avoid recomputation
- Batch processing for bulk operations
- MongoDB indexing for fast queries
- FAISS for efficient vector similarity search

## 🚀 Deployment

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

1. **Backend**: Deploy to your preferred Node.js hosting
2. **AI Service**: Deploy to Python hosting (Heroku, AWS, etc.)
3. **Frontend**: Build and deploy to static hosting
4. **Database**: Use MongoDB Atlas or self-hosted MongoDB

## 📝 Project Structure

```
campus-placement/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, RBAC
│   │   └── services/        # Business logic
│   ├── tests/               # Backend tests
│   └── package.json
├── ai-service/             # Python FastAPI
│   ├── app/
│   │   ├── api/             # AI endpoints
│   │   ├── core/            # Configuration
│   │   ├── models/          # ML models
│   │   └── services/         # AI logic
│   ├── tests/               # AI service tests
│   └── requirements.txt
├── frontend/                # React app
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API calls
│   │   └── utils/           # Utilities
│   └── package.json
└── docker-compose.yml       # Local development
```

## 🎨 UI/UX Features

- **Dark Theme**: Black background with red primary actions
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliant components
- **Modern UI**: Clean, professional interface
- **Real-time Updates**: Live notifications and updates

## 🔍 AI Features

### RAG Chatbot
- Contextual career guidance
- Document-based responses
- Source citations
- Follow-up suggestions

### Resume Parsing
- Automatic skill extraction
- Project identification
- Experience parsing
- Contact information extraction

### Job Recommendations
- AI-powered matching
- Skill-based scoring
- Preference learning
- Similar job suggestions

### Certificate Generation
- PDF generation with templates
- QR code verification
- Tamper-evident hashing
- Digital signatures

## 📊 Demo Data

The system comes with pre-seeded demo data:

**Users**:
- Student: john.doe@student.edu / password123
- Mentor: michael.johnson@mentor.edu / password123
- Placement Cell: sarah.wilson@placement.edu / password123
- Recruiter: hr@techcorp.com / password123
- Admin: admin@campus.edu / password123

**Sample Data**:
- 2 job postings
- 2 student profiles
- Sample applications
- Mock certificates

## 🛡️ Security Checklist

- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Data encryption
- ✅ Secure file uploads

## 📈 Monitoring & Analytics

- Application performance metrics
- User activity tracking
- AI model performance
- Error logging and monitoring
- Database query optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API docs
- Contact the development team

---

**Built with ❤️ for campus placement success**
