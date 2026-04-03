"""
Video Processing API for FRC Scoreboard OCR
Flask backend that accepts video files with crop coordinates,
extracts frames, runs OCR, and returns score timeline.
"""

# Fix SSL certificate issues for EasyOCR model downloads
import ssl
import urllib.request
import certifi

# Create SSL context that uses certifi's certificates
ssl_context = ssl.create_default_context(cafile=certifi.where())
urllib.request.install_opener(urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=ssl_context)
))

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import cv2
import numpy as np
import os
import tempfile
import uuid
import time
import json
from processors.frame_extractor import extract_frames_at_fps
from processors.image_preprocessor import preprocess_for_ocr
from processors.ocr_processor import extract_score, get_reader
from processors.score_analyzer import detect_score_changes

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Enable CORS for React frontend

# Store processing status (in production, use Redis or similar)
processing_status = {}

# Configure upload folder
UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max

# Preload EasyOCR model at startup (downloads once, then cached)
print("[API] Preloading EasyOCR model (first run may take a minute)...")
try:
    _ = get_reader()
    print("[API] EasyOCR model ready")
except Exception as e:
    print(f"[API] Warning: Could not preload EasyOCR model: {e}")
    print("[API] Will try to load on first request...")


def cleanup_files(*paths):
    """Clean up temporary files."""
    for path in paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"Error cleaning up {path}: {e}")


@app.route('/api/process-video', methods=['POST'])
def process_video():
    """
    Process video with crop coordinates and return score timeline.
    
    Expected form data:
    - video: video file
    - cropX: x coordinate of crop region (pixels)
    - cropY: y coordinate of crop region (pixels)
    - cropWidth: width of crop region (pixels)
    - cropHeight: height of crop region (pixels)
    - alliance: 'red' or 'blue' (for logging/debugging)
    
    For progress updates, use the /api/process-video/stream endpoint instead.
    """
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        
        # Get crop coordinates and time range
        crop_x = int(request.form.get('cropX', 0))
        crop_y = int(request.form.get('cropY', 0))
        crop_width = int(request.form.get('cropWidth', 100))
        crop_height = int(request.form.get('cropHeight', 100))
        alliance = request.form.get('alliance', 'unknown')
        
        # Get time range parameters
        start_time = float(request.form.get('startTime', 0))
        end_time = float(request.form.get('endTime', 0)) if request.form.get('endTime') else None
        
        # Get official score for calculating missing fuel in last 3 seconds
        official_score = request.form.get('officialScore')
        official_score = int(official_score) if official_score else None
        
        print(f"[API] Processing {alliance} video with crop: x={crop_x}, y={crop_y}, w={crop_width}, h={crop_height}")
        print(f"[API] Time range: start={start_time:.2f}s, end={end_time}s")
        
        # Save uploaded video to temp file
        temp_video_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}.mp4")
        video_file.save(temp_video_path)
        
        try:
            # Get video info
            cap = cv2.VideoCapture(temp_video_path)
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            cap.release()
            
            video_duration = total_frames / video_fps if video_fps > 0 else 0
            
            print(f"[API] Video info: {total_frames} frames, {video_fps} fps, {video_duration:.1f}s duration")
            
            # Step 1: Extract frames at 5fps with time range
            print("[API] Step 1: Extracting frames at 5fps...")
            frames = extract_frames_at_fps(temp_video_path, fps=5, start_time=start_time, end_time=end_time)
            
            if not frames:
                return jsonify({'error': 'Could not extract frames from video'}), 400
            
            print(f"[API] ✓ Extracted {len(frames)} frames")
            
            # Step 2: Crop and OCR
            print("[API] Step 2: Cropping frames and running OCR...")
            print(f"[API]     Crop: x={crop_x}, y={crop_y}, w={crop_width}, h={crop_height}")
            
            # Step 2a: Preprocess all frames first
            print("[API] Step 2a: Preprocessing frames...")
            cropped_frames = []
            timestamps = []
            
            for i, (timestamp, frame) in enumerate(frames):
                # Crop
                h, w = frame.shape[:2]
                x1 = max(0, min(crop_x, w - 1))
                y1 = max(0, min(crop_y, h - 1))
                x2 = max(0, min(crop_x + crop_width, w))
                y2 = max(0, min(crop_y + crop_height, h))
                
                cropped = frame[y1:y2, x1:x2]
                if cropped.size == 0:
                    continue
                
                # Preprocess
                processed = preprocess_for_ocr(cropped)
                cropped_frames.append(processed)
                timestamps.append(timestamp)
            
            print(f"[API] ✓ Preprocessed {len(cropped_frames)} frames")
            
            # Step 2b: Batch OCR processing (much faster!)
            print("[API] Step 2b: Running batch OCR...")
            from processors.ocr_processor import extract_score_batch
            
            try:
                batch_scores = extract_score_batch(cropped_frames)
            except Exception as e:
                print(f"[API] Batch OCR failed, falling back to single-frame: {e}")
                # Fall back to single-frame processing
                batch_scores = []
                for processed in cropped_frames:
                    try:
                        score = extract_score(processed)
                        batch_scores.append(score)
                    except:
                        batch_scores.append(None)
            
            scores = []
            ocr_results = []
            total = len(cropped_frames)
            
            for i, (timestamp, score) in enumerate(zip(timestamps, batch_scores)):
                ocr_results.append({'frame': i, 'timestamp': round(timestamp, 3), 'score': score})
                
                if score is not None:
                    print(f"[API]     Frame {i} @ {timestamp:.2f}s -> {score}")
                    scores.append((timestamp, score))
            
            print(f"[API] ✓ OCR found {len(scores)} scores from {len(frames)} frames")
            
            # Step 3: Analyze
            print("[API] Step 3: Analyzing score changes...")
            score_timeline = detect_score_changes(scores)
            total_score = score_timeline[-1]['score'] if score_timeline else 0
            
            print(f"[API] ✓ Timeline: {len(score_timeline)} changes, total: {total_score}")

            return jsonify({
                'success': True,
                'scoreTimeline': score_timeline,
                'totalScore': total_score,
                'framesProcessed': len(frames),
                'scoresRead': len(scores)
            })
            
        finally:
            cleanup_files(temp_video_path)
            
    except Exception as e:
        print(f"[API] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


@app.route('/api/process-video-stream', methods=['POST'])
def process_video_stream():
    """
    Process video with SSE for progress updates.
    Yields progress events as the video is processed.
    """
    def generate():
        try:
            # Check if video file is present
            if 'video' not in request.files:
                yield f"data: {json.dumps({'error': 'No video file provided'})}\n\n"
                return
            
            video_file = request.files['video']
            
            # Get crop coordinates
            crop_x = int(request.form.get('cropX', 0))
            crop_y = int(request.form.get('cropY', 0))
            crop_width = int(request.form.get('cropWidth', 100))
            crop_height = int(request.form.get('cropHeight', 100))
            alliance = request.form.get('alliance', 'unknown')
            
            # Get time range parameters
            start_time = float(request.form.get('startTime', 0))
            end_time = float(request.form.get('endTime', 0)) if request.form.get('endTime') else None
            
            # Get official score for reference (not used in stream endpoint for now)
            official_score = request.form.get('officialScore')
            official_score = int(official_score) if official_score else None
            
            print(f"[API] Processing {alliance} video with crop: x={crop_x}, y={crop_y}, w={crop_width}, h={crop_height}")
            print(f"[API] Time range: start={start_time:.2f}s, end={end_time}s")
            
            # Save uploaded video to temp file
            temp_video_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}.mp4")
            video_file.save(temp_video_path)
            
            try:
                # Get video info
                cap = cv2.VideoCapture(temp_video_path)
                video_fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                cap.release()
                
                video_duration = total_frames / video_fps if video_fps > 0 else 0
                
                print(f"[API] Video info: {total_frames} frames, {video_fps} fps, {video_duration:.1f}s duration")
                
                yield json.dumps({'status': 'starting', 'message': 'Starting video processing...'}) + '\n\n'
                
                # Step 1: Extract frames at 5fps with time range
                print("[API] Step 1: Extracting frames at 5fps...")
                yield json.dumps({'status': 'extracting', 'message': 'Extracting frames...'}) + '\n\n'
                
                frames = extract_frames_at_fps(temp_video_path, fps=5, start_time=start_time, end_time=end_time)
                
                if not frames:
                    yield json.dumps({'error': 'Could not extract frames from video'}) + '\n\n'
                    return
                
                print(f"[API] ✓ Extracted {len(frames)} frames")
                yield json.dumps({'status': 'extracted', 'frames': len(frames), 'message': f'Extracted {len(frames)} frames'}) + '\n\n'
                
                # Step 2a: Preprocess all frames
                print("[API] Step 2a: Preprocessing frames...")
                yield json.dumps({'status': 'preprocessing', 'message': 'Preprocessing frames...'}) + '\n\n'
                
                cropped_frames = []
                timestamps = []
                
                for i, (timestamp, frame) in enumerate(frames):
                    # Crop
                    h, w = frame.shape[:2]
                    x1 = max(0, min(crop_x, w - 1))
                    y1 = max(0, min(crop_y, h - 1))
                    x2 = max(0, min(crop_x + crop_width, w))
                    y2 = max(0, min(crop_y + crop_height, h))
                    
                    cropped = frame[y1:y2, x1:x2]
                    if cropped.size == 0:
                        continue
                    
                    # Preprocess
                    processed = preprocess_for_ocr(cropped)
                    cropped_frames.append(processed)
                    timestamps.append(timestamp)
                
                print(f"[API] ✓ Preprocessed {len(cropped_frames)} frames")
                yield json.dumps({'status': 'preprocessed', 'frames': len(cropped_frames), 'message': f'Preprocessed {len(cropped_frames)} frames'}) + '\n\n'
                
                # Step 2b: Batch OCR processing
                print("[API] Step 2b: Running batch OCR...")
                yield json.dumps({'status': 'processing', 'message': 'Running batch OCR...'}) + '\n\n'
                
                from processors.ocr_processor import extract_score_batch
                
                try:
                    batch_scores = extract_score_batch(cropped_frames)
                except Exception as e:
                    print(f"[API] Batch OCR failed, falling back: {e}")
                    # Fall back to single-frame
                    batch_scores = []
                    for processed in cropped_frames:
                        try:
                            score = extract_score(processed)
                            batch_scores.append(score)
                        except:
                            batch_scores.append(None)
                
                scores = []
                total = len(cropped_frames)
                
                for i, (timestamp, score) in enumerate(zip(timestamps, batch_scores)):
                    if score is not None:
                        scores.append((timestamp, score))
                
                yield json.dumps({'status': 'ocr_complete', 'scores_found': len(scores), 'message': f'OCR found {len(scores)} scores'}) + '\n\n'
                
                print(f"[API] ✓ OCR found {len(scores)} scores from {len(frames)} frames")
                
                # Step 3: Analyze
                print("[API] Step 3: Analyzing score changes...")
                yield json.dumps({'status': 'analyzing', 'message': 'Analyzing score changes...'}) + '\n\n'
                
                score_timeline = detect_score_changes(scores)
                total_score = score_timeline[-1]['score'] if score_timeline else 0
                
                print(f"[API] ✓ Timeline: {len(score_timeline)} changes, total: {total_score}")
                
                yield json.dumps({
                    'status': 'complete',
                    'success': True,
                    'scoreTimeline': score_timeline,
                    'totalScore': total_score,
                    'framesProcessed': len(frames),
                    'scoresRead': len(scores),
                    'message': f'Processing complete! Found {len(scores)} scores'
                }) + '\n\n'
                
            finally:
                cleanup_files(temp_video_path)
                
        except Exception as e:
            print(f"[API] Error: {str(e)}")
            import traceback
            traceback.print_exc()
            yield json.dumps({'error': f'Processing failed: {str(e)}'}) + '\n\n'
    
    return Response(generate(), mimetype='text/event-stream')


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'video-processor'})


if __name__ == '__main__':
    # Run on port 5001 (5000 is used by AirPlay on macOS)
    app.run(host='0.0.0.0', port=5001, debug=True)
