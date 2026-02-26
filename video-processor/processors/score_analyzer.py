"""
Score analyzer module - detects score changes from OCR results.
"""

from processors.ocr_processor import validate_score_sequence


def detect_score_changes(scores):
    """
    Detect score changes from OCR results and generate timeline.
    
    Args:
        scores: List of (timestamp, score) tuples from OCR
        
    Returns:
        List of score change events with timestamps
    """
    if not scores:
        return []
    
    # First, validate the score sequence to filter OCR errors
    valid_scores = validate_score_sequence(scores)
    
    if not valid_scores:
        return []
    
    # Build timeline with score changes
    timeline = []
    previous_score = None
    
    for timestamp, score in valid_scores:
        if previous_score is None:
            # First score - add initial entry
            timeline.append({
                'timestamp': round(timestamp, 2),
                'score': score,
                'increment': 0
            })
        elif score != previous_score:
            # Score changed - calculate increment
            increment = score - previous_score
            
            # Only add if it's a valid positive change (or reset to 0)
            if increment > 0 or (increment < 0 and score == 0):
                timeline.append({
                    'timestamp': round(timestamp, 2),
                    'score': score,
                    'increment': increment
                })
        
        previous_score = score
    
    return timeline


def analyze_score_pattern(timeline):
    """
    Analyze score pattern for additional insights.
    
    Args:
        timeline: Score timeline from detect_score_changes
        
    Returns:
        Dictionary with analysis results
    """
    if not timeline:
        return {
            'totalScore': 0,
            'scoreCount': 0,
            'avgScorePerChange': 0,
            'firstScoreTime': None,
            'lastScoreTime': None
        }
    
    total_score = timeline[-1]['score'] if timeline else 0
    score_count = len(timeline)
    
    # Calculate average points per scoring action
    increments = [entry['increment'] for entry in timeline if entry['increment'] > 0]
    avg_increment = sum(increments) / len(increments) if increments else 0
    
    # Get timing info
    first_time = timeline[0]['timestamp'] if timeline else None
    last_time = timeline[-1]['timestamp'] if timeline else None
    
    return {
        'totalScore': total_score,
        'scoreCount': score_count,
        'avgScorePerChange': round(avg_increment, 2),
        'firstScoreTime': first_time,
        'lastScoreTime': last_time,
        'matchDuration': round(last_time - first_time, 2) if first_time and last_time else 0
    }
