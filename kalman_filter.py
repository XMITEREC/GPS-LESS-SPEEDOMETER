# kalman_filter.py
import math

class SensorFusionFilter:
    def __init__(self):
        self.pitch = 0.0
        self.roll = 0.0
        self.yaw = 0.0

        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0

        # Complementary filter weights (example)
        self.gyroWeight = 0.98
        self.accWeight = 0.02

    def update(self, ax, ay, az, gx, gy, gz, dt):
        # Convert gyro deg/s to rad/s (if input is in deg/s)
        gx_rad = math.radians(gx)
        gy_rad = math.radians(gy)
        gz_rad = math.radians(gz)

        # Integrate gyro to update orientation
        self.pitch += gx_rad * dt
        self.roll += gy_rad * dt
        self.yaw += gz_rad * dt

        # Approximate pitch/roll from accelerometer (assuming it's mostly gravity)
        accelPitch = math.atan2(ay, math.sqrt(ax**2 + az**2))
        accelRoll = math.atan2(-ax, math.sqrt(ay**2 + az**2))

        # Complementary filter
        self.pitch = self.gyroWeight * self.pitch + self.accWeight * accelPitch
        self.roll = self.gyroWeight * self.roll + self.accWeight * accelRoll
        # Yaw could be fused with magnetometer data if available, omitted for brevity

        # Compute rotation terms to transform device acceleration to world frame
        sinP = math.sin(self.pitch)
        cosP = math.cos(self.pitch)
        sinR = math.sin(self.roll)
        cosR = math.cos(self.roll)

        # Rotate (ax, ay, az) from device coords to approximate world coords
        # This is a simplified approach ignoring yaw or more advanced transformations
        ax_world = ax * cosP + az * sinP
        ay_world = ax * sinR * sinP + ay * cosR - az * sinR * cosP
        az_world = -ax * cosR * sinP + ay * sinR + az * cosR * cosP

        # Subtract gravity (assuming ~ +9.81 in world Z down)
        az_world += 9.81

        # Integrate acceleration to get velocity
        self.vx += ax_world * dt
        self.vy += ay_world * dt
        self.vz += az_world * dt

        speed = math.sqrt(self.vx**2 + self.vy**2 + self.vz**2)
        return speed
