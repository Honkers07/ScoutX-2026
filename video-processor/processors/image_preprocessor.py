"""
Image preprocessing module - prepares images for OCR.
Optimized for white digits on blue background (scoreboard display).
"""

import cv2
import numpy as np


def preprocess_for_ocr(image):
    """
    Preprocess image for better OCR accuracy.
    Optimized for white digits on blue background.
    
    Args:
        image: Input image (numpy array from OpenCV)
        
    Returns:
        Preprocessed image ready for OCR
    """
    # Convert to grayscale if not already
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # For white on blue: invert to make digits black on white (better for OCR)
    # First, threshold to separate bright (white) from dark (blue)
    _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
    
    # Invert so digits are black on white background
    inverted = cv2.bitwise_not(binary)
    
    # Apply slight blur to reduce noise
    blurred = cv2.GaussianBlur(inverted, (3, 3), 0)
    
    # Scale up for better OCR accuracy (digits become more distinct)
    scale_factor = 3  # Increased from 2 to 3 for larger digits
    scaled = cv2.resize(
        blurred, 
        None, 
        fx=scale_factor, 
        fy=scale_factor, 
        interpolation=cv2.INTER_CUBIC
    )
    
    return scaled


def enhance_contrast(image):
    """
    Enhance contrast for better digit visibility.
    
    Args:
        image: Input image
        
    Returns:
        Contrast-enhanced image
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to L channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    
    # Merge channels
    lab = cv2.merge([l, a, b])
    
    # Convert back to BGR
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    
    return enhanced
