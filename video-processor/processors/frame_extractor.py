"""
Frame extraction module - extracts frames from video at specified FPS.
Supports time range cropping (start_time and end_time in seconds).
Includes optimizations for skipping duplicate/unchanged frames.
"""

import cv2
import numpy as np


def compute_frame_hash(frame):
    """
    Compute a quick hash of a frame for duplicate detection.
    Uses a downsampled grayscale version for speed.
    
    Args:
        frame: Input frame (numpy array)
        
    Returns:
        Integer hash value
    """
    # Convert to grayscale if needed
    if len(frame.shape) == 3:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = frame
    
    # Downsample for speed (8x reduction)
    small = cv2.resize(gray, (32, 32))
    
    # Compute simple hash
    return hash(small.tobytes())


def compute_frame_difference(frame1, frame2, threshold=500):
    """
    Compute difference between two frames.
    
    Args:
        frame1: First frame
        frame2: Second frame
        threshold: Minimum difference to consider frames different
        
    Returns:
        True if frames are significantly different, False otherwise
    """
    if frame1 is None or frame2 is None:
        return True
    
    # Convert to grayscale if needed
    if len(frame1.shape) == 3:
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    else:
        gray1 = frame1
        gray2 = frame2
    
    # Downsample for speed
    small1 = cv2.resize(gray1, (64, 64))
    small2 = cv2.resize(gray2, (64, 64))
    
    # Compute absolute difference
    diff = cv2.absdiff(small1, small2)
    
    # Sum differences
    diff_sum = np.sum(diff)
    
    return diff_sum > threshold


def extract_frames_at_fps(video_path, fps=3, start_time=0, end_time=None,
                          skip_duplicate_frames=True, skip_unchanged_frames=True,
                          change_threshold=200):
    """
    Extract frames from video at specified frames per second within a time range.
    
    Args:
        video_path: Path to the video file
        fps: Target frames per second to extract
        start_time: Start time in seconds (default: 0)
        end_time: End time in seconds (default: video duration)
        skip_duplicate_frames: If True, skip frames that are identical to previous
        skip_unchanged_frames: If True, skip frames that are very similar to previous
        change_threshold: Minimum difference to consider frames different (default: 500)
        
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
    print(f"[FrameExtractor] Optimizations: skip_dups={skip_duplicate_frames}, skip_unchanged={skip_unchanged_frames}")
    
    frames = []
    frame_count = start_frame
    current_timestamp = start_time
    
    # For duplicate/unchanged detection
    prev_frame = None
    prev_hash = None
    skipped_dups = 0
    skipped_unchanged = 0
    
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
            # Check for duplicate or unchanged frames
            should_skip = False
            
            if skip_duplicate_frames and prev_frame is not None:
                # Check for exact duplicate using hash
                current_hash = compute_frame_hash(frame)
                if current_hash == prev_hash:
                    skipped_dups += 1
                    should_skip = True
            
            if skip_unchanged_frames and not should_skip and prev_frame is not None:
                # Check for significantly unchanged frame
                if not compute_frame_difference(prev_frame, frame, change_threshold):
                    skipped_unchanged += 1
                    should_skip = True
            
            if not should_skip:
                # Calculate timestamp in seconds relative to start_time
                timestamp = current_timestamp - start_time
                frames.append((timestamp, frame))
                
                # Update previous frame for next iteration
                prev_frame = frame.copy()
                prev_hash = compute_frame_hash(frame)
            else:
                # Still update prev_frame so we compare against the last kept frame
                prev_frame = frame
                prev_hash = compute_frame_hash(frame)
        
        frame_count += 1
    
    cap.release()
    print(f"[FrameExtractor] Extracted {len(frames)} frames (skipped {skipped_dups} duplicates, {skipped_unchanged} unchanged)")
    
    return frames
