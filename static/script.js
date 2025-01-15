/*
script.js
Handles:
- DeviceMotionEvent capturing
- Server requests for Kalman fusion (/update_sensors) and CNN classification (/classify_mode)
- Offline fallback integration
- Real-time chart (speed vs time) drawing
- UI updates (speed value, user mode, button states)
*/

const canvas = document.getElementById("speedChart");
const ctx = canvas.getContext("2d");

// High-DPI handling for chart
canvas.width = canvas.clientWidth * 2;
canvas.height = canvas.clientHeight * 2;

let speedData = [];
let timeData = [];
let chartStartTime = performance.now();

/**
 * drawChart renders the speed vs. time line graph.
 */
function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (speedData.length < 2) {
    return;
  }

  const padding = 30;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  const maxSpeed = Math.max(...speedData);
  const minSpeed = Math.min(...speedData);
  const speedRange = maxSpeed - minSpeed || 1;

  const minTime = timeData[0];
  const maxTime = timeData[timeData.length - 1];
  const timeRange = maxTime - minTime || 1;

  // Axes
  ctx.beginPath();
  // x-axis
  ctx.moveTo(padding, height + padding);
  ctx.lineTo(padding + width, height + padding);
  // y-axis
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + height);
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Plot speed data
  ctx.beginPath();
  for (let i = 0; i < speedData.length; i++) {
    const tNorm = (timeData[i] - minTime) / timeRange; // 0..1
    const sNorm = (speedData[i] - minSpeed) / speedRange; // 0..1
    const x = padding + tNorm * width;
    const y = padding + (1 - sNorm) * height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = "#4c51bf";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Client-side fallback velocity
let lastTimestamp = 0;
let velocity = { x: 0, y: 0, z: 0 };

// Classification buffer
let classificationBuffer = [];
let bufferStartTime = Date.now();

/**
 * collectForClassification accumulates sensor data for ~1 second, then computes features and sends to /classify_mode.
 */
function collectForClassification(ax, ay, az, gx, gy, gz) {
  classificationBuffer.push({ ax, ay, az, gx, gy, gz });
  const elapsed = Date.now() - bufferStartTime;
  if (elapsed >= 1000) {
    const features = computeFeatures(classificationBuffer);
    classificationBuffer = [];
    bufferStartTime = Date.now();
    sendClassificationRequest(features);
  }
}

/**
 * computeFeatures calculates basic mean features from the buffered sensor samples.
 */
function computeFeatures(samples) {
  let sumAx = 0, sumAy = 0, sumAz = 0;
  let sumGx = 0, sumGy = 0, sumGz = 0;

  samples.forEach(s => {
    sumAx += s.ax;
    sumAy += s.ay;
    sumAz += s.az;
    sumGx += s.gx;
    sumGy += s.gy;
    sumGz += s.gz;
  });

  const n = samples.length;
  const meanAx = sumAx / n;
  const meanAy = sumAy / n;
  const meanAz = sumAz / n;
  const meanGx = sumGx / n;
  const meanGy = sumGy / n;
  const meanGz = sumGz / n;

  // Return a feature vector
  return [meanAx, meanAy, meanAz, meanGx, meanGy, meanGz];
}

/**
 * sendClassificationRequest sends a POST to /classify_mode and updates the UI with the returned mode.
 */
async function sendClassificationRequest(features) {
  try {
    const resp = await fetch('/classify_mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });
    if (!resp.ok) {
      throw new Error('Classification request failed');
    }
    const data = await resp.json();
    document.getElementById('modeDisplay').textContent = `Mode: ${data.mode}`;
  } catch (error) {
    document.getElementById('modeDisplay').textContent = "Mode: Offline";
  }
}

/**
 * handleMotion is the devicemotion event handler, performing:
 *  1) Data integration with server-based Kalman filter or fallback
 *  2) Speed and chart updates
 *  3) Classification data collection
 */
async function handleMotion(event) {
  const currentTimestamp = event.timeStamp;
  if (lastTimestamp === 0) {
    lastTimestamp = currentTimestamp;
    return;
  }
  const dt = (currentTimestamp - lastTimestamp) / 1000.0;
  lastTimestamp = currentTimestamp;

  const ax = event.acceleration.x || 0;
  const ay = event.acceleration.y || 0;
  const az = event.acceleration.z || 0;
  const gx = event.rotationRate.alpha || 0; // deg/s
  const gy = event.rotationRate.beta || 0;  // deg/s
  const gz = event.rotationRate.gamma || 0; // deg/s

  let speed;
  try {
    // Send data to the server's Kalman filter
    const resp = await fetch('/update_sensors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ax, ay, az, gx, gy, gz, dt })
    });
    if (!resp.ok) {
      throw new Error('Non-200 from server');
    }
    const data = await resp.json();
    speed = data.speed;
  } catch (err) {
    // Fallback: naive integration
    velocity.x += ax * dt;
    velocity.y += ay * dt;
    velocity.z += az * dt;
    speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
  }

  // Update speed UI
  document.getElementById('speed-value').textContent = speed.toFixed(2);

  // Update chart data
  const now = performance.now() - chartStartTime;
  speedData.push(speed);
  timeData.push(now);
  drawChart();

  // Collect data for classification
  collectForClassification(ax, ay, az, gx, gy, gz);
}

// Enable Motion Sensors button
const startBtn = document.getElementById('startBtn');
startBtn.addEventListener('click', async () => {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  ) {
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
        startBtn.disabled = true;
        startBtn.textContent = "Sensors Enabled";
      } else {
        alert('Permission not granted for Device Motion.');
      }
    } catch (e) {
      alert('Error requesting Device Motion permission.');
    }
  } else {
    window.addEventListener('devicemotion', handleMotion);
    startBtn.disabled = true;
    startBtn.textContent = "Sensors Enabled";
  }
});

// Handle window resize for responsive chart
window.addEventListener('resize', () => {
  canvas.width = canvas.clientWidth * 2;
  canvas.height = canvas.clientHeight * 2;
  drawChart();
});
