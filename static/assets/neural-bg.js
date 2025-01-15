/*
neural-bg.js
Creates a floating particle animation in the background with ~40% opacity.
*/

const canvasBG = document.getElementById('neuralBG');
const ctxBG = canvasBG.getContext('2d');
let particles = [];

function resizeBG() {
  canvasBG.width = window.innerWidth;
  canvasBG.height = window.innerHeight;
}
window.addEventListener('resize', resizeBG);
resizeBG();

for (let i = 0; i < 80; i++) {
  particles.push({
    x: Math.random() * canvasBG.width,
    y: Math.random() * canvasBG.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: 2 + Math.random() * 2
  });
}

function animateBG() {
  ctxBG.clearRect(0, 0, canvasBG.width, canvasBG.height);

  particles.forEach(p => {
    ctxBG.beginPath();
    ctxBG.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
    ctxBG.fillStyle = "#4c51bf";
    ctxBG.fill();

    p.x += p.vx;
    p.y += p.vy;

    // Wrap around screen edges
    if (p.x < 0) {
      p.x = canvasBG.width;
    } else if (p.x > canvasBG.width) {
      p.x = 0;
    }
    if (p.y < 0) {
      p.y = canvasBG.height;
    } else if (p.y > canvasBG.height) {
      p.y = 0;
    }
  });

  requestAnimationFrame(animateBG);
}
animateBG();
