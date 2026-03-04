/**
 * Browser-based proctoring utilities for exam anti-malpractice.
 *
 * Covers: VM detection, DevTools detection, Print-Screen overlay,
 * and webcam proctoring helpers.
 */

// ---------------------------------------------------------------------------
// 1. VM / Remote-Desktop Detection
// ---------------------------------------------------------------------------

interface VMDetectionResult {
  isVM: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  signals: string[];
}

const VM_GPU_KEYWORDS = [
  'swiftshader',
  'llvmpipe',
  'softpipe',
  'virtualbox',
  'vmware',
  'svga3d',
  'microsoft basic render',
  'google swiftshader',
  'parallels',
  'hyper-v',
  'qemu',
  'bochs',
  'xen',
];

const REMOTE_DESKTOP_UA_KEYWORDS = [
  'anydesk',
  'teamviewer',
  'rustdesk',
  'chrome remote desktop',
  'parsec',
];

export function detectVM(): VMDetectionResult {
  const signals: string[] = [];

  // --- WebGL renderer check ---
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const glCtx = gl as WebGLRenderingContext;
      const debugExt = glCtx.getExtension('WEBGL_debug_renderer_info');
      if (debugExt) {
        const renderer = glCtx
          .getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
          ?.toLowerCase() || '';
        const vendor = glCtx
          .getParameter(debugExt.UNMASKED_VENDOR_WEBGL)
          ?.toLowerCase() || '';

        for (const kw of VM_GPU_KEYWORDS) {
          if (renderer.includes(kw) || vendor.includes(kw)) {
            signals.push(`GPU renderer matches VM keyword: "${kw}" (${renderer})`);
          }
        }
      } else {
        signals.push('WEBGL_debug_renderer_info unavailable (common in VMs)');
      }
    } else {
      signals.push('WebGL context unavailable');
    }
  } catch {
    // ignore
  }

  // --- Low hardware concurrency ---
  const cores = navigator.hardwareConcurrency;
  if (cores && cores <= 2) {
    signals.push(`Low CPU core count: ${cores} (VMs often have 1-2)`);
  }

  // --- Low device memory ---
  const mem = (navigator as any).deviceMemory;
  if (mem && mem <= 2) {
    signals.push(`Low device memory: ${mem} GB`);
  }

  // --- Screen dimensions anomaly (RDP often gives unusual sizes) ---
  if (
    (window.screen.width === 1024 && window.screen.height === 768) ||
    (window.screen.width === 800 && window.screen.height === 600)
  ) {
    signals.push(`Unusual screen resolution: ${window.screen.width}x${window.screen.height}`);
  }

  // --- User-agent artifacts for remote desktop ---
  const ua = navigator.userAgent.toLowerCase();
  for (const kw of REMOTE_DESKTOP_UA_KEYWORDS) {
    if (ua.includes(kw)) {
      signals.push(`Remote desktop UA keyword: "${kw}"`);
    }
  }

  // --- navigator.platform / userAgentData check for VM ---
  try {
    const uaData = (navigator as any).userAgentData;
    if (uaData?.platform) {
      const platform = uaData.platform.toLowerCase();
      if (platform.includes('virtual') || platform.includes('vmware')) {
        signals.push(`Platform indicates VM: ${platform}`);
      }
    }
  } catch {
    // ignore
  }

  const confidence: VMDetectionResult['confidence'] =
    signals.length >= 3 ? 'high' :
    signals.length === 2 ? 'medium' :
    signals.length === 1 ? 'low' : 'none';

  return { isVM: signals.length >= 2, confidence, signals };
}

/** Async check: VMs typically report no battery */
export async function checkBatteryVM(): Promise<string | null> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      if (
        battery.charging &&
        battery.level === 1 &&
        battery.chargingTime === 0 &&
        battery.dischargingTime === Infinity
      ) {
        return 'Battery API suggests VM (always full, always charging)';
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. DevTools Detection
// ---------------------------------------------------------------------------

export interface DevToolsDetector {
  start: () => void;
  stop: () => void;
}

/**
 * Detects open DevTools using two non-blocking methods:
 * - Window outer/inner size differential (docked DevTools)
 * - console.log with toString trap (works even when detached)
 */
export function createDevToolsDetector(
  onDetected: () => void,
): DevToolsDetector {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastDetected = 0;

  const THRESHOLD_PX = 160;
  const COOLDOWN_MS = 10_000;

  const check = () => {
    const now = Date.now();
    if (now - lastDetected < COOLDOWN_MS) return;

    // Method 1: outer vs inner size diff (works when docked)
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > THRESHOLD_PX || heightDiff > THRESHOLD_PX) {
      lastDetected = now;
      onDetected();
      return;
    }

    // Method 2: console.log with toString trap
    // When DevTools console is open, logged objects get their toString() called
    const el = new Image();
    let detected = false;
    Object.defineProperty(el, 'id', {
      get: () => {
        detected = true;
        return '';
      },
    });
    // console.log triggers getter only when DevTools is open
    console.log('%c', el as any);
    if (detected) {
      lastDetected = now;
      onDetected();
    }
  };

  return {
    start: () => {
      if (intervalId) return;
      intervalId = setInterval(check, 3000);
    },
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Print Screen Overlay
// ---------------------------------------------------------------------------

let overlayEl: HTMLDivElement | null = null;

/**
 * Flashes a black overlay on PrintScreen / Win+Shift+S so screenshots
 * capture a blank screen. Only listens for keyboard events (NOT blur,
 * since the exam page already handles blur as a violation).
 */
export function setupPrintScreenBlocker(): () => void {
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
      e.preventDefault();
      e.stopPropagation();
      flashOverlay();
    }
    // Win+Shift+S (Snip & Sketch)
    if (e.key === 's' && e.shiftKey && e.metaKey) {
      flashOverlay();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Block PrintScreen on keydown too (some browsers fire here)
    if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
      e.preventDefault();
      e.stopPropagation();
      flashOverlay();
    }
  };

  document.addEventListener('keyup', handleKeyUp, true);
  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('keyup', handleKeyUp, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    removeOverlay();
  };
}

function flashOverlay() {
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:#000;pointer-events:none;';
  document.body.appendChild(overlayEl);
  setTimeout(removeOverlay, 500);
}

function removeOverlay() {
  if (overlayEl && overlayEl.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayEl = null;
}

// ---------------------------------------------------------------------------
// 4. Webcam Proctoring (face-api.js)
// ---------------------------------------------------------------------------

export interface ProctoringEvent {
  type: 'no_face' | 'multiple_faces' | 'face_turned' | 'face_ok' | 'camera_denied';
  message: string;
  timestamp: number;
}

export interface WebcamProctor {
  start: () => Promise<boolean>;
  stop: () => void;
  getStream: () => MediaStream | null;
}

export function createWebcamProctor(
  videoElement: HTMLVideoElement,
  onEvent: (event: ProctoringEvent) => void,
): WebcamProctor {
  let stream: MediaStream | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let faceApi: any = null;
  let modelsLoaded = false;
  let noFaceFrames = 0;
  let stopped = false;
  const NO_FACE_THRESHOLD = 10; // ~5 seconds at 2fps before alert

  const loadModels = async () => {
    try {
      // Dynamic import with @vite-ignore to skip resolution of optional dep
      const mod = 'face-api.js';
      // @ts-ignore
      faceApi = await import(/* @vite-ignore */ mod);
      const MODEL_URL = '/models';
      await Promise.all([
        faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceApi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch {
      modelsLoaded = false;
    }
  };

  const detectLoop = async () => {
    if (!faceApi || !modelsLoaded || !stream || stopped) return;

    try {
      const detections = await faceApi
        .detectAllFaces(videoElement, new faceApi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);

      if (detections.length === 0) {
        noFaceFrames++;
        if (noFaceFrames >= NO_FACE_THRESHOLD) {
          onEvent({
            type: 'no_face',
            message: 'No face detected — please look at the screen',
            timestamp: Date.now(),
          });
          noFaceFrames = 0;
        }
      } else if (detections.length > 1) {
        onEvent({
          type: 'multiple_faces',
          message: `${detections.length} faces detected — only the student should be visible`,
          timestamp: Date.now(),
        });
        noFaceFrames = 0;
      } else {
        noFaceFrames = 0;
        const landmarks = detections[0].landmarks;
        const nose = landmarks.getNose();
        const jaw = landmarks.getJawOutline();
        if (nose.length > 0 && jaw.length > 0) {
          const noseX = nose[0].x;
          const jawLeft = jaw[0].x;
          const jawRight = jaw[jaw.length - 1].x;
          const faceWidth = jawRight - jawLeft;
          const noseCenterRatio = (noseX - jawLeft) / faceWidth;
          if (noseCenterRatio < 0.25 || noseCenterRatio > 0.75) {
            onEvent({
              type: 'face_turned',
              message: 'Please face the screen directly',
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch {
      // Detection error — skip frame
    }

    if (!stopped) {
      timeoutId = setTimeout(detectLoop, 500); // ~2fps
    }
  };

  return {
    start: async () => {
      stopped = false;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        videoElement.srcObject = stream;
        await videoElement.play();

        await loadModels();
        if (modelsLoaded) {
          detectLoop();
        }
        return true;
      } catch {
        onEvent({
          type: 'camera_denied',
          message: 'Camera access denied — webcam proctoring unavailable',
          timestamp: Date.now(),
        });
        return false;
      }
    },
    stop: () => {
      stopped = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      videoElement.srcObject = null;
    },
    getStream: () => stream,
  };
}
