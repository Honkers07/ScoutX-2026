"""
OCR processor module - extracts text/numbers from images using EasyOCR.
EasyOCR doesn't require Tesseract installation - uses deep learning.
"""

import easyocr
import re

# Initialize EasyOCR reader (loads model on first use)
# GPU is automatically used if available
_reader = None

def get_reader():
    """Get or create the EasyOCR reader instance."""
    global _reader
    if _reader is None:
        print("[OCR] Loading EasyOCR model (first run may take a minute)...")
        # English only, GPU=True if available, verbose=False
        _reader = easyocr.Reader(['en'], gpu=True, verbose=False)
        print("[OCR] EasyOCR model loaded successfully")
    return _reader


def extract_score(image):
    """
    Extract score (number) from preprocessed image using EasyOCR.
    
    Args:
        image: Input image (numpy array from OpenCV)
        
    Returns:
        Integer score if found, None otherwise
    """
    try:
        reader = get_reader()
        
        # EasyOCR returns list of detections
        # Each detection: [bbox, text, confidence]
        results = reader.readtext(image)
        
        if not results:
            return None
        
        # Find the best numeric result
        best_score = None
        best_confidence = 0
        
        for bbox, text, confidence in results:
            # Clean the text - keep only digits
            cleaned = ''.join(filter(str.isdigit, text))
            
            if cleaned and confidence > 0.3:  # Minimum confidence threshold
                score = int(cleaned)
                
                # Validate score is reasonable (FRC scores typically 0-999)
                if 0 <= score <= 999:
                    # Prefer higher confidence and more confident readings
                    if confidence > best_confidence:
                        best_score = score
                        best_confidence = confidence
        
        if best_score is not None:
            print(f"[OCR] Extracted score: {best_score} (confidence: {best_confidence:.2f})")
        
        return best_score
        
    except Exception as e:
        print(f"[OCR] Error extracting score: {e}")
        return None


def extract_score_with_confidence(image):
    """
    Extract score with confidence level.
    
    Args:
        image: Input image
        
    Returns:
        Tuple of (score, confidence) or (None, 0) if failed
    """
    try:
        reader = get_reader()
        results = reader.readtext(image)
        
        if not results:
            return None, 0
        
        best_score = None
        best_confidence = 0
        
        for bbox, text, confidence in results:
            cleaned = ''.join(filter(str.isdigit, text))
            
            if cleaned and confidence > 0.3:
                score = int(cleaned)
                
                if 0 <= score <= 999 and confidence > best_confidence:
                    best_score = score
                    best_confidence = confidence
        
        return best_score, best_confidence
        
    except Exception as e:
        print(f"[OCR] Error extracting score with confidence: {e}")
        return None, 0


def validate_score_sequence(scores):
    """
    Validate a sequence of scores to filter out obvious OCR errors.
    
    Args:
        scores: List of (timestamp, score) tuples
        
    Returns:
        Filtered list of valid scores
    """
    if not scores:
        return []
    
    # Score should generally increase or stay the same (with some exceptions for resets)
    # Filter out impossible jumps
    valid_scores = [scores[0]]
    
    for i in range(1, len(scores)):
        timestamp, score = scores[i]
        _, prev_score = valid_scores[-1]
        
        # Allow score increases (typical)
        # Allow same score (no change)
        # Allow reset to 0 after very high scores (match restart)
        # Filter out random noise
        if score >= prev_score:
            valid_scores.append((timestamp, score))
        elif prev_score > 50 and score == 0:
            # Possible reset
            valid_scores.append((timestamp, score))
        # Otherwise skip this score as likely OCR error
    
    return valid_scores
