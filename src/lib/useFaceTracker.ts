import { useCallback, useEffect, useRef } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import {
  computeEAR,
  computeGlare,
  strainScore,
  ema,
  EAR_SQUINT,
  EAR_CLOSED,
  GLARE_HIGH,
} from './eyeMetrics';
import { useStore, setLiveMetrics } from '../store';
import { nearestRestStop, positionAlongRoute } from './geo';

export interface TrackerCallbacks {
  onRestStop?: (name: string) => void;
}

/**
 * useFaceTracker wires a <video> element to MediaPipe FaceLandmarker and runs
 * the per-frame analysis loop. ALL processing happens in-browser; the video
 * stream is never uploaded or stored.
 */
export function useFaceTracker(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTime = useRef<number>(-1);

  // smoothed signals
  const earS = useRef(0.3);
  const glareS = useRef(0.2);
  const strainS = useRef(0);

  // event debouncing
  const lastEventAt = useRef<Record<string, number>>({});
  const closureFrames = useRef(0);
  const blinkTimes = useRef<number[]>([]);

  const {
    pushSample,
    pushEvent,
    setAlert,
    setFaceDetected,
  } = useStore.getState();

  const maybeEmit = useCallback(
    (type: 'squint' | 'glare' | 'blink-burst' | 'closure', payload: {
      strain: number;
      glare: number;
      ear: number;
    }) => {
      const now = performance.now();
      const last = lastEventAt.current[type] ?? 0;
      // throttle each event type to at most once / 3s
      if (now - last < 3000) return;
      lastEventAt.current[type] = now;
      pushEvent({ type, ...payload });
    },
    [pushEvent]
  );

  const analyze = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(analyze);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(analyze);
      return;
    }

    // keep canvas sized to the video
    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

    // draw current frame for glare sampling
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const glareRaw = computeGlare(frame.data, canvas.width, canvas.height);

    let earRaw = earS.current;
    let detected = false;

    if (video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      let result: FaceLandmarkerResult | undefined;
      try {
        result = landmarker.detectForVideo(video, performance.now());
      } catch {
        result = undefined;
      }
      if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
        detected = true;
        earRaw = computeEAR(result.faceLandmarks[0]);
      }
    } else {
      detected = useStore.getState().faceDetected;
    }

    setFaceDetected(detected);

    // smooth
    earS.current = ema(earS.current, earRaw, 0.4);
    glareS.current = ema(glareS.current, glareRaw, 0.25);
    const strain = strainScore(earS.current, glareS.current);
    strainS.current = ema(strainS.current, strain, 0.3);

    const ear = earS.current;
    const glare = glareS.current;
    const strainNow = Math.round(strainS.current);

    setLiveMetrics(ear, glare, strainNow);
    pushSample({ ear, glare, strain: strainNow });

    // --- event detection ---
    if (detected) {
      // squint: EAR in strain band (narrowed but not blinking)
      if (ear < EAR_SQUINT && ear > EAR_CLOSED) {
        maybeEmit('squint', { strain: strainNow, glare, ear });
      }
      // glare: bright scene
      if (glare > GLARE_HIGH) {
        maybeEmit('glare', { strain: strainNow, glare, ear });
      }
      // closure tracking -> blink burst detection
      if (ear < EAR_CLOSED) {
        closureFrames.current++;
      } else {
        if (closureFrames.current >= 1) {
          blinkTimes.current.push(performance.now());
        }
        closureFrames.current = 0;
      }
      // sustained closure (drowsiness / microsleep) — distinct from strain
      if (closureFrames.current > 18) {
        maybeEmit('closure', { strain: Math.max(strainNow, 70), glare, ear });
      }
      // blink burst: many blinks in a short window (eye fatigue)
      const cutoff = performance.now() - 6000;
      blinkTimes.current = blinkTimes.current.filter((x) => x > cutoff);
      if (blinkTimes.current.length >= 8) {
        maybeEmit('blink-burst', { strain: Math.max(strainNow, 60), glare, ear });
        blinkTimes.current = [];
      }
    }

    // --- alert level ---
    if (strainNow >= 70 || closureFrames.current > 18) {
      setAlert('alert');
    } else if (strainNow >= 45) {
      setAlert('caution');
    } else {
      setAlert('ok');
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, [videoRef, canvasRef, pushSample, maybeEmit, setAlert, setFaceDetected]);

  const start = useCallback(async () => {
    // 1. init MediaPipe (served from the official CDN wasm bundle)
    if (!landmarkerRef.current) {
      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    }

    // 2. webcam
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
      audio: false,
    });
    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play();
    }

    // 3. loop
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(analyze);
    }
  }, [analyze, videoRef]);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, [videoRef]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop };
}

/** Convenience: current rest-stop suggestion from live route progress. */
export function useRestStopSuggestion() {
  const progress = useStore((s) => s.routeProgress);
  const pos = positionAlongRoute(progress);
  return { restStop: nearestRestStop(pos.lat, pos.lng), position: pos };
}
