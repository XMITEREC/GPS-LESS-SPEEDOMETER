/*****************************************************
 * Basic chart setup for speed vs. time
 *****************************************************/
const canvas = document.getElementById("speedChart");
const ctx = canvas.getContext("2d");
canvas.width = canvas.clientWidth * 2;
canvas.height = 300;

let speedData = [];
let timeData = [];
let chartStartTime = performance.now();

function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (speedData.length < 2) return;

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
  ctx.moveTo(padding, height + padding);
  ctx.lineTo(padding + width, height + padding);
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + height);
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Plot data
  ctx.beginPath();
  for (let i = 0; i < speedData.length; i++) {
    const tNorm = (timeData[i] - minTime) / timeRange;
    const sNorm = (speedData[i] - minSpeed) / speedRange;
    const x = padding + tNorm * width;
    const y = padding + (1 - sNorm) * height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#007bff";
  ctx.stroke();
}

/*****************************************************
 * Client-side fallback integration
 *****************************************************/
let lastTimestamp = 0;
let velocity = { x: 0, y: 0, z: 0 };

/*****************************************************
 * DeviceMotion handler
 *****************************************************/
async function handleMotion(event) {
  const currentTimestamp = event.timeStamp;
  if (lastTimestamp === 0) {
    lastTimestamp = currentTimestamp;
    return;
  }
  const dt = (currentTimestamp - lastTimestamp) / 1000.0;

  const ax = event.acceleration.x || 0;
  const ay = event.acceleration.y || 0;
  const az = event.acceleration.z || 0;

  const gx = event.rotationRate.alpha || 0; // deg/s
  const gy = event.rotationRate.beta  || 0; // deg/s
  const gz = event.rotationRate.gamma || 0; // deg/s

  let speed;
  try {
    // Attempt server-based Kalman fusion
    const response = await fetch('/update_sensors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ax, ay, az, gx, gy, gz, dt })
    });
    if (!response.ok) {
      throw new Error('Non-200 response');
    }
    const data = await response.json();
    speed = data.speed;
  } catch (err) {
    // Fallback: naive client-side integration
    velocity.x += ax * dt;
    velocity.y += ay * dt;
    velocity.z += az * dt;
    speed = Math.sqrt(
      velocity.x * velocity.x +
      velocity.y * velocity.y +
      velocity.z * velocity.z
    );
  }

  document.getElementById('speed-value').textContent = speed.toFixed(2);

  const now = performance.now() - chartStartTime;
  speedData.push(speed);
  timeData.push(now);
  drawChart();

  lastTimestamp = currentTimestamp;
}

/*****************************************************
 * Enable sensors on iOS or start immediately on others
 *****************************************************/
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
      console.error(e);
      alert('Error while requesting Device Motion permission: ' + e);
    }
  } else {
    window.addEventListener('devicemotion', handleMotion);
    startBtn.disabled = true;
    startBtn.textContent = "Sensors Enabled";
  }
});

/*****************************************************
 * Resize chart on window resize
 *****************************************************/
window.addEventListener('resize', () => {
  canvas.width = canvas.clientWidth * 2;
  canvas.height = 300;
  drawChart();
});
