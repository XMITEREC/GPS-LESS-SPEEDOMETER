# app.py
from flask import Flask, request, jsonify
from kalman_filter import SensorFusionFilter
import os

app = Flask(__name__, static_folder='static', template_folder='static')

# Global filter instance for demonstration.
# In a multi-user environment, store separate filters per user/session.
fusion_filter = SensorFusionFilter()

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/update_sensors', methods=['POST'])
def update_sensors():
    """
    Receives JSON data:
    {
      "ax": float, "ay": float, "az": float,  # linear accelerations (m/s^2)
      "gx": float, "gy": float, "gz": float,  # gyro rotation rates (deg/s)
      "dt": float                             # time step in seconds
    }
    Returns JSON with the updated speed, e.g. { "speed": float }
    """
    data = request.get_json()
    ax = data.get('ax', 0.0)
    ay = data.get('ay', 0.0)
    az = data.get('az', 0.0)
    gx = data.get('gx', 0.0)
    gy = data.get('gy', 0.0)
    gz = data.get('gz', 0.0)
    dt = data.get('dt', 0.01)

    speed = fusion_filter.update(ax, ay, az, gx, gy, gz, dt)
    return jsonify({"speed": speed})

# Service worker and manifest routes:
@app.route('/manifest.json')
def manifest():
    return app.send_static_file('manifest.json')

@app.route('/service-worker.js')
def sw():
    return app.send_static_file('service-worker.js')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
