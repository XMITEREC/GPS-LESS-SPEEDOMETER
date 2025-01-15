"""
app.py
Flask backend for the AI Speedometer app.
Provides:
- Root route '/' serving index.html
- /update_sensors endpoint receiving accelerometer+gyroscope data for Kalman fusion
- /classify_mode endpoint receiving preprocessed feature vectors for CNN classification
- PWA manifest and service worker routes
"""

import os
from flask import Flask, request, jsonify
from kalman_filter import SensorFusionFilter
from ml_model import UserModeClassifier

app = Flask(__name__, static_folder='static', template_folder='static')

# Global SensorFusionFilter instance for handling orientation compensation and velocity integration
fusion_filter = SensorFusionFilter()

# Global classifier for user mode classification (walk, run, drive, etc.)
# model_path is the location of your trained model file (e.g., 'model.h5')
mode_classifier = UserModeClassifier(model_path='model.h5')

@app.route('/')
def index():
    """
    Serves the main page (index.html) from the static folder.
    """
    return app.send_static_file('index.html')

@app.route('/update_sensors', methods=['POST'])
def update_sensors():
    """
    Receives raw sensor data and returns the updated speed from the Kalman/Complementary filter.
    Expects JSON:
      {
        "ax": float,
        "ay": float,
        "az": float,
        "gx": float,
        "gy": float,
        "gz": float,
        "dt": float
      }
    Returns JSON:
      {
        "speed": float
      }
    """
    data = request.get_json()
    ax = data.get('ax', 0.0)
    ay = data.get('ay', 0.0)
    az = data.get('az', 0.0)
    gx = data.get('gx', 0.0)
    gy = data.get('gy', 0.0)
    gz = data.get('gz', 0.0)
    dt = data.get('dt', 0.01)

    # Perform Kalman/Complementary sensor fusion to get real-time speed
    speed = fusion_filter.update(ax, ay, az, gx, gy, gz, dt)

    return jsonify({"speed": speed})

@app.route('/classify_mode', methods=['POST'])
def classify_mode():
    """
    Receives preprocessed features array and returns the user's mode classification.
    Expects JSON:
      {
        "features": [float, float, ...]
      }
    Returns JSON:
      {
        "mode": str
      }
    """
    data = request.get_json()
    features = data.get('features', [])
    predicted_mode = mode_classifier.predict_mode(features)
    return jsonify({"mode": predicted_mode})

@app.route('/manifest.json')
def manifest():
    """
    Serves the PWA manifest (static/manifest.json).
    """
    return app.send_static_file('manifest.json')

@app.route('/service-worker.js')
def sw():
    """
    Serves the service worker script (static/service-worker.js).
    """
    return app.send_static_file('service-worker.js')

if __name__ == '__main__':
    """
    Entry point for local development. 
    The 'Procfile' is used when deploying to Heroku or another PaaS with gunicorn.
    """
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
