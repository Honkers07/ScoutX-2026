"""
Frame extraction module - extracts frames from video at specified FPS.
"""

import cv2


def extract_frames_at_fps(video_path, fps=5):
    """
    Extract frames from video at specified frames per second.
    
    Args:
        video_path: Path to the video file
        fps: Target frames per second to extract
        
    Returns:
        List of (timestamp, frame) tuples
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"[FrameExtractor] Error: Could not open video {video_path}")
        return []
    
    # Get original video FPS
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(video_fps / fps) if fps > 0 else 1
    
    print(f"[FrameExtractor] Video FPS: {video_fps}, Extracting at: {fps} fps (interval: {frame_interval})")
    
    frames = []
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Extract frame at specified interval
        if frame_count % frame_interval == 0:
            # Calculate timestamp in seconds
            timestamp = frame_count / video_fps
            frames.append((timestamp, frame))
        
        frame_count += 1
    
    cap.release()
    print(f"[FrameExtractor] Extracted {len(frames)} frames from {frame_count} total frames")
    
    return frames
