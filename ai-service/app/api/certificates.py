from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import qrcode
from io import BytesIO
import base64
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.core.config import settings

router = APIRouter()

class CertificateRequest(BaseModel):
    certificateId: str = Field(..., description="Certificate ID")
    studentName: str = Field(..., description="Student name")
    jobTitle: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    supervisorFeedback: Dict[str, Any] = Field(..., description="Supervisor feedback")
    issuedAt: str = Field(..., description="Issue date")
    validUntil: str = Field(..., description="Valid until date")
    verificationCode: str = Field(..., description="Verification code")

class CertificateResponse(BaseModel):
    pdfUrl: str
    qrCodeUrl: str
    certificateId: str

@router.post("/generate-certificate", response_model=CertificateResponse)
async def generate_certificate(request: CertificateRequest):
    """
    Generate certificate PDF with QR code
    """
    try:
        # Generate PDF
        pdf_buffer = generate_certificate_pdf(request)
        
        # Generate QR code
        qr_code_data = generate_qr_code(request.verificationCode)
        
        # Save files (in production, save to cloud storage)
        pdf_filename = f"certificate_{request.certificateId}.pdf"
        qr_filename = f"qr_{request.certificateId}.png"
        
        pdf_path = os.path.join(settings.UPLOAD_PATH, pdf_filename)
        qr_path = os.path.join(settings.UPLOAD_PATH, qr_filename)
        
        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_PATH, exist_ok=True)
        
        # Save PDF
        with open(pdf_path, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        
        # Save QR code
        with open(qr_path, 'wb') as f:
            f.write(qr_code_data)
        
        return CertificateResponse(
            pdfUrl=f"/uploads/{pdf_filename}",
            qrCodeUrl=f"/uploads/{qr_filename}",
            certificateId=request.certificateId
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating certificate: {str(e)}"
        )

def generate_certificate_pdf(request: CertificateRequest) -> BytesIO:
    """
    Generate certificate PDF using ReportLab
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    # Build content
    story = []
    
    # Title
    story.append(Paragraph("CERTIFICATE OF COMPLETION", title_style))
    story.append(Spacer(1, 20))
    
    # Certificate content
    content_style = ParagraphStyle(
        'Content',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=12,
        alignment=1
    )
    
    story.append(Paragraph(f"This is to certify that <b>{request.studentName}</b>", content_style))
    story.append(Paragraph(f"has successfully completed the internship as", content_style))
    story.append(Paragraph(f"<b>{request.jobTitle}</b> at <b>{request.company}</b>", content_style))
    story.append(Spacer(1, 30))
    
    # Supervisor feedback
    if request.supervisorFeedback:
        feedback_style = ParagraphStyle(
            'Feedback',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=12,
            alignment=0  # Left alignment
        )
        
        story.append(Paragraph("Supervisor Feedback:", feedback_style))
        story.append(Paragraph(f"Rating: {request.supervisorFeedback.get('rating', 'N/A')}/5", feedback_style))
        story.append(Paragraph(f"Feedback: {request.supervisorFeedback.get('feedback', 'N/A')}", feedback_style))
        
        if request.supervisorFeedback.get('skillsDemonstrated'):
            skills = ', '.join(request.supervisorFeedback['skillsDemonstrated'])
            story.append(Paragraph(f"Skills Demonstrated: {skills}", feedback_style))
    
    story.append(Spacer(1, 30))
    
    # Dates
    story.append(Paragraph(f"Issued on: {request.issuedAt}", content_style))
    story.append(Paragraph(f"Valid until: {request.validUntil}", content_style))
    
    # Verification info
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"Certificate ID: {request.certificateId}", content_style))
    story.append(Paragraph(f"Verification Code: {request.verificationCode}", content_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer

def generate_qr_code(verification_code: str) -> bytes:
    """
    Generate QR code for certificate verification
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    
    # Create verification URL
    verification_url = f"http://localhost:3000/verify-certificate/{verification_code}"
    
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    # Create QR code image
    qr_image = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_buffer = BytesIO()
    qr_image.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    return img_buffer.getvalue()

