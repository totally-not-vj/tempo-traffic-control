# Smart Traffic Management System - Flask Backend
# Enhanced version for SIH Project Demo

from flask import Flask, jsonify, request
from flask_cors import CORS
import cv2
import threading
import time
import numpy as np
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
traffic_counts = {"north": 0, "south": 0, "east": 0, "west": 0}
traffic_counts_lock = threading.Lock()
current_signal = "north"
manual_override = False
signal_timer = time.time()
detection_active = False

# AI Traffic Control Parameters
MAX_GREEN_TIME = 30  # seconds
MIN_GREEN_TIME = 8   # seconds
HIGH_TRAFFIC_THRESHOLD = 15
LOW_TRAFFIC_THRESHOLD = 3

class VehicleDetector:
    def __init__(self, video_source="intersection.mp4"):
        self.cap = cv2.VideoCapture(video_source)
        self.background_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500, 
            varThreshold=50, 
            detectShadows=True
        )
        self.min_contour_area = 500
        
    def detect_vehicles_in_frame(self, frame):
        """Enhanced vehicle detection with region-based counting"""
        # Apply background subtraction
        fg_mask = self.background_subtractor.apply(frame)
        
        # Noise reduction
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Count vehicles in each direction based on frame regions
        height, width = frame.shape[:2]
        center_x, center_y = width // 2, height // 2
        
        region_counts = {"north": 0, "south": 0, "east": 0, "west": 0}
        
        for contour in contours:
            if cv2.contourArea(contour) > self.min_contour_area:
                # Get contour center
                M = cv2.moments(contour)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    
                    # Assign to regions based on position
                    if cy < center_y - 50:  # North region
                        region_counts["north"] += 1
                    elif cy > center_y + 50:  # South region
                        region_counts["south"] += 1
                    elif cx < center_x - 50:  # West region
                        region_counts["west"] += 1
                    elif cx > center_x + 50:  # East region
                        region_counts["east"] += 1
        
        return region_counts, fg_mask

def ai_signal_controller():
    """AI-based signal timing logic"""
    global current_signal, signal_timer, traffic_counts, manual_override
    
    if manual_override:
        return
    
    with traffic_counts_lock:
        time_since_change = time.time() - signal_timer
        current_count = traffic_counts[current_signal]
        
        # Find direction with highest traffic
        max_traffic_dir = max(traffic_counts, key=traffic_counts.get)
        max_traffic_count = traffic_counts[max_traffic_dir]
        
        should_switch = False
        new_signal = current_signal
        
        # Rule 1: Maximum time exceeded
        if time_since_change > MAX_GREEN_TIME:
            should_switch = True
            new_signal = max_traffic_dir
            logger.info(f"Max time exceeded, switching to {new_signal}")
        
        # Rule 2: Current direction low traffic, other direction high traffic
        elif (time_since_change > MIN_GREEN_TIME and 
              current_count < LOW_TRAFFIC_THRESHOLD and 
              max_traffic_count > HIGH_TRAFFIC_THRESHOLD and
              max_traffic_dir != current_signal):
            should_switch = True
            new_signal = max_traffic_dir
            logger.info(f"Smart switch: {current_signal}({current_count}) -> {new_signal}({max_traffic_count})")
        
        # Rule 3: Emergency switch for very high traffic in other direction
        elif (max_traffic_count > HIGH_TRAFFIC_THRESHOLD * 2 and 
              max_traffic_dir != current_signal and
              time_since_change > MIN_GREEN_TIME // 2):
            should_switch = True
            new_signal = max_traffic_dir
            logger.info(f"Emergency switch for high traffic: {new_signal}({max_traffic_count})")
        
        if should_switch:
            current_signal = new_signal
            signal_timer = time.time()

def detection_thread():
    """Main detection and control loop"""
    global traffic_counts, detection_active
    
    detector = VehicleDetector()
    detection_active = True
    
    logger.info("Starting vehicle detection...")
    
    while detection_active:
        try:
            ret, frame = detector.cap.read()
            
            if not ret:
                # Loop video for demo
                detector.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            
            # Detect vehicles
            region_counts, fg_mask = detector.detect_vehicles_in_frame(frame)
            
            # Update global counts with smoothing
            with traffic_counts_lock:
                for direction in traffic_counts:
                    # Smooth the counts to avoid rapid fluctuations
                    old_count = traffic_counts[direction]
                    new_count = region_counts[direction]
                    traffic_counts[direction] = int(0.7 * old_count + 0.3 * new_count)
            
            # Run AI signal controller
            ai_signal_controller()
            
            # Add visual feedback (optional for demo)
            cv2.putText(frame, f'N:{traffic_counts["north"]} S:{traffic_counts["south"]}', 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f'E:{traffic_counts["east"]} W:{traffic_counts["west"]}', 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f'Current: {current_signal.upper()}', 
                       (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Show detection (comment out for production)
            cv2.imshow('Traffic Detection', frame)
            cv2.imshow('Foreground Mask', fg_mask)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
            time.sleep(0.1)  # Control update rate
            
        except Exception as e:
            logger.error(f"Detection error: {e}")
            time.sleep(1)
    
    detector.cap.release()
    cv2.destroyAllWindows()
    logger.info("Detection stopped")

# Flask API Routes
@app.route("/")
def home():
    return jsonify({
        "status": "Smart Traffic Management System is running",
        "endpoints": ["/get_counts", "/set_signal/<direction>", "/end_override"]
    })

@app.route("/get_counts")
def get_counts():
    """Get current traffic counts and signal status"""
    with traffic_counts_lock:
        current_counts = traffic_counts.copy()
    
    response = {
        "counts": current_counts,
        "signal": current_signal,
        "manual_override": manual_override,
        "timestamp": time.time(),
        "total_vehicles": sum(current_counts.values())
    }
    return jsonify(response)

@app.route("/set_signal/<direction>", methods=['GET', 'POST'])
def set_signal(direction):
    """Manual signal override"""
    global current_signal, manual_override, signal_timer
    
    valid_directions = ["north", "south", "east", "west"]
    
    if direction.lower() not in valid_directions:
        return jsonify({
            "status": "error", 
            "message": f"Invalid direction. Use: {valid_directions}"
        }), 400
    
    with traffic_counts_lock:
        current_signal = direction.lower()
        manual_override = True
        signal_timer = time.time()
    
    logger.info(f"Manual override activated: {direction}")
    
    return jsonify({
        "status": "success",
        "message": f"Signal manually set to {direction}",
        "current_signal": current_signal,
        "manual_override": manual_override
    })

@app.route("/end_override", methods=['GET', 'POST'])
def end_override():
    """End manual override and return to AI control"""
    global manual_override
    
    manual_override = False
    
    logger.info("Manual override ended, returning to AI control")
    
    return jsonify({
        "status": "success",
        "message": "Manual override ended, AI control resumed",
        "manual_override": manual_override
    })

@app.route("/system_status")
def system_status():
    """Get system health and statistics"""
    return jsonify({
        "detection_active": detection_active,
        "manual_override": manual_override,
        "current_signal": current_signal,
        "uptime": time.time() - signal_timer,
        "total_vehicles": sum(traffic_counts.values()),
        "high_traffic_threshold": HIGH_TRAFFIC_THRESHOLD,
        "signal_timing": {
            "max_green_time": MAX_GREEN_TIME,
            "min_green_time": MIN_GREEN_TIME
        }
    })

if __name__ == "__main__":
    # Start detection thread
    detection_thread_obj = threading.Thread(target=detection_thread, daemon=True)
    detection_thread_obj.start()
    
    # Start Flask server
    logger.info("Starting Flask server on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)