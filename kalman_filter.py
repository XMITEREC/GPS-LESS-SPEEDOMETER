"""
kalman_filter.py
Provides a basic SensorFusionFilter class for orientation compensation (pitch/roll) 
and gravity removal, integrating acceleration to produce a real-time speed estimate.
"""

import math

class SensorFusionFilter:
    def __init__(self):
        # Orientation angles (radians)
        self.pitch = 0.0
        self.roll = 0.0
        self.yaw = 0.0

        # Velocity in world coords
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0

        # Complementary filter weights for gyro vs. accel
        self.gyroWeight = 0.98
        self.accWeight = 0.02

    def update(self, ax, ay, az, gx, gy, gz, dt):
        """
        ax, ay, az: Linear acceleration in device coordinates (m/s^2)
        gx, gy, gz: Gyro rotation rates in deg/s
        dt: Time step (seconds)

        Returns: speed (m/s) as a float
        """
        # Convert gyro from deg/s to rad/s
        gx_rad = math.radians(gx)
        gy_rad = math.radians(gy)
        gz_rad = math.radians(gz)

        # Integrate gyros to update orientation
        self.pitch += gx_rad * dt
        self.roll  += gy_rad * dt
        self.yaw   += gz_rad * dt

        # Approximate pitch/roll from accelerometer (assuming mostly gravity)
        accelPitch = math.atan2(ay, math.sqrt(ax**2 + az**2))
        accelRoll  = math.atan2(-ax, math.sqrt(ay**2 + az**2))

        # Complementary filter
        self.pitch = self.gyroWeight * self.pitch + self.accWeight * accelPitch
        self.roll  = self.gyroWeight * self.roll  + self.accWeight * accelRoll
        # Yaw can be fused with magnetometer if available (omitted here)

        # Transform device acceleration to a world frame using pitch & roll
        sinP = math.sin(self.pitch)
        cosP = math.cos(self.pitch)
        sinR = math.sin(self.roll)
        cosR = math.cos(self.roll)

        # Basic rotation ignoring yaw
        ax_world = ax * cosP + az * sinP
        ay_world = ax * sinR * sinP + ay * cosR - az * sinR * cosP
        az_world = -ax * cosR * sinP + ay * sinR + az * cosR * cosP

        # Subtract gravity if device coords included it
        az_world += 9.81

        # Integrate acceleration to get velocity
        self.vx += ax_world * dt
        self.vy += ay_world * dt
        self.vz += az_world * dt

        # Speed is magnitude of velocity
        speed = math.sqrt(self.vx**2 + self.vy**2 + self.vz**2)
        return speed
