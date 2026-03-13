"""
Frame extraction module - extracts frames from video at specified FPS.
Supports time range cropping (start_time and end_time in seconds).
"""

import cv2


def extract_frames_at_fps(video_path, fps=5, start_time=0, end_time=None):
    """
    Extract frames from video at specified frames per second within a time range.
    
    Args:
        video_path: Path to the video file
        fps: Target frames per second to extract
        start_time: Start time in seconds (default: 0)
        end_time: End time in seconds (default: video duration)
        
    Returns:
        List of (timestamp, frame) tuples
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"[FrameExtractor] Error: Could not open video {video_path}")
        return []
    
    # Get original video FPS
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_duration = total_frames / video_fps if video_fps > 0 else 0
    
    # Set default end_time to video duration if not specified
    if end_time is None or end_time > video_duration:
        end_time = video_duration
    
    # Validate time range
    if start_time < 0:
        start_time = 0
    if end_time <= start_time:
        end_time = start_time + 1  # At least 1 second
    
    # Seek to start time
    start_frame = int(start_time * video_fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    frame_interval = int(video_fps / fps) if fps > 0 else 1
    
    print(f"[FrameExtractor] Video FPS: {video_fps}, Extracting at: {fps} fps (interval: {frame_interval})")
    print(f"[FrameExtractor] Time range: {start_time:.2f}s to {end_time:.2f}s (duration: {end_time - start_time:.2f}s)")
    
    frames = []
    frame_count = start_frame
    current_timestamp = start_time
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Check if we've passed the end time
        current_timestamp = frame_count / video_fps
        if current_timestamp > end_time:
            break
        
        # Extract frame at specified interval
        if (frame_count - start_frame) % frame_interval == 0:
            # Calculate timestamp in seconds relative to start_time
            timestamp = current_timestamp - start_time
            frames.append((timestamp, frame))
        
        frame_count += 1
    
    cap.release()
    print(f"[FrameExtractor] Extracted {len(frames)} frames from {frame_count - start_frame} frames in time range")
    
    return frames
