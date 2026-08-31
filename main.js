// Configuration & State
const totalFrames = 226;
const preloadedImages = {};
let loadedCount = 0;

let currentFrameIndex = 1;
let targetFrameIndex = 1;
let lastRenderedIndex = -1;
const easingFactor = 0.07; // Easing coefficient for smooth Apple-style inertial scroll

const canvas = document.getElementById('birthday-canvas');
const ctx = canvas.getContext('2d');

const loadingOverlay = document.getElementById('loading-overlay');
const progressBar = document.getElementById('progress-bar');
const loadingPercentageText = document.getElementById('loading-percentage');
const scrollIndicator = document.getElementById('scroll-indicator');

// 1. Initialize Canvas Size and Scaling
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Set the canvas size in physical pixels
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // Set the CSS size to match the viewport
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // Reset the render index to force redraw with new dimensions
  lastRenderedIndex = -1;
  renderCurrentFrame();
}

// 2. Map scroll position to frame index
function updateScrollTarget() {
  const scrollTop = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  
  const scrollFraction = maxScroll > 0 ? scrollTop / maxScroll : 0;
  
  // Map scroll fraction linearly to [1, totalFrames]
  targetFrameIndex = 1 + scrollFraction * (totalFrames - 1);
  
  // Fade out scroll indicator on scroll
  if (scrollTop > 30) {
    scrollIndicator.classList.add('hidden');
  }
}

// 3. Draw current frame on canvas with object-fit: contain
function renderCurrentFrame() {
  const index = Math.round(currentFrameIndex);
  
  // Skip redraw if we are already showing this frame
  if (index === lastRenderedIndex) return;
  
  const img = preloadedImages[index];
  if (!img || !img.complete) return;
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;
  
  const imgRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  // object-fit: contain logic
  if (imgRatio > canvasRatio) {
    // Image is wider than canvas relative to height
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) / 2;
  } else {
    // Image is taller than canvas relative to width
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgRatio;
    drawX = (canvasWidth - drawWidth) / 2;
    drawY = 0;
  }
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  
  lastRenderedIndex = index;
}

// 4. Batch preloader to avoid network saturation and ensure smooth progress updates
function preloadImages() {
  return new Promise((resolve) => {
    let currentPreloadIndex = 1;
    const batchSize = 15; // Load 15 images in parallel at any time
    
    function loadNext() {
      if (currentPreloadIndex > totalFrames) return;
      
      const frameIndex = currentPreloadIndex;
      currentPreloadIndex++;
      
      const frameNum = String(frameIndex).padStart(3, '0');
      const img = new Image();
      img.src = `/bday/ezgif-frame-${frameNum}.jpg`;
      
      img.onload = () => {
        preloadedImages[frameIndex] = img;
        handleImageLoad(resolve, loadNext);
      };
      
      img.onerror = () => {
        console.warn(`Failed to load frame ${frameNum}, skipping.`);
        // Put a fallback or empty object to prevent lockups
        preloadedImages[frameIndex] = null;
        handleImageLoad(resolve, loadNext);
      };
    }
    
    function handleImageLoad(resolvePromise, nextCallback) {
      loadedCount++;
      
      // Update loading progress UI
      const percentage = Math.round((loadedCount / totalFrames) * 100);
      progressBar.style.width = `${percentage}%`;
      loadingPercentageText.innerText = `${percentage}%`;
      
      if (loadedCount === totalFrames) {
        resolvePromise();
      } else {
        nextCallback();
      }
    }
    
    // Spawn initial batch of loads
    for (let i = 0; i < Math.min(batchSize, totalFrames); i++) {
      loadNext();
    }
  });
}

// 5. Animation Render Loop (LERP)
function animate() {
  const diff = targetFrameIndex - currentFrameIndex;
  
  // Interpolation logic
  if (Math.abs(diff) < 0.001) {
    currentFrameIndex = targetFrameIndex;
  } else {
    currentFrameIndex += diff * easingFactor;
  }
  
  renderCurrentFrame();
  requestAnimationFrame(animate);
}

// 6. Bootstrap Application
async function init() {
  // Listeners
  window.addEventListener('scroll', updateScrollTarget);
  
  // Handle desktop resize (ignore height adjustments from mobile url bar collapsing)
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      resizeCanvas();
    }
  });
  
  // Force resize on orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 200);
  });
  
  // Initial size check
  resizeCanvas();
  
  // Start image preload
  await preloadImages();
  
  // Set initial frame target
  updateScrollTarget();
  currentFrameIndex = targetFrameIndex; // Prevent initial snap transition
  renderCurrentFrame();
  
  // Fade out loading screen and display content
  loadingOverlay.style.opacity = '0';
  loadingOverlay.style.pointerEvents = 'none';
  
  setTimeout(() => {
    loadingOverlay.style.visibility = 'hidden';
    scrollIndicator.classList.remove('hidden');
  }, 1000);
  
  // Start render loop
  requestAnimationFrame(animate);
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
