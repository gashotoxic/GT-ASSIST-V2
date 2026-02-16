import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X } from 'lucide-react';
import { Button } from '../UI';

type FacingMode = 'user' | 'environment';

function estimateDataUrlBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function clampSize(width: number, height: number, maxDim: number) {
  const largest = Math.max(width, height);
  if (!largest || largest <= maxDim) return { width, height };
  const scale = maxDim / largest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function requestCameraStream(facingMode: FacingMode) {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

export function CameraCaptureModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (value: { dataUrl: string; mimeType: string; name: string }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');

  const title = useMemo(() => (facingMode === 'environment' ? 'Rear camera' : 'Front camera'), [facingMode]);

  useEffect(() => {
    if (!props.isOpen) return;

    let cancelled = false;
    setIsStarting(true);
    setError(null);

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not supported in this browser.');
        }
        const stream = await requestCameraStream(facingMode);
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to open camera.';
        setError(message);
      } finally {
        setIsStarting(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      const stream = streamRef.current;
      streamRef.current = null;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [props.isOpen, facingMode]);

  useEffect(() => {
    if (!props.isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [props.isOpen]);

  useEffect(() => {
    if (!props.isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.isOpen, props.onClose]);

  if (!props.isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="flex h-full w-full items-end md:items-center justify-center p-2 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div
          ref={sheetRef}
          className="w-full max-w-2xl overflow-hidden rounded-t-3xl md:rounded-3xl border border-white/10 bg-white/90 dark:bg-slate-900/90 shadow-2xl flex flex-col max-h-[min(92dvh,52rem)] md:max-h-[min(80dvh,52rem)]"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/20 dark:border-white/10">
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white truncate">Camera</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{title}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFacingMode(m => (m === 'environment' ? 'user' : 'environment'))}
              >
                Flip
              </Button>
              <Button variant="ghost" size="icon" onClick={props.onClose} aria-label="Close camera">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="h-1 w-12 rounded-full bg-black/10 dark:bg-white/10 mx-auto mt-2 md:hidden" />

          <div className="p-3 sm:p-4 flex-1 min-h-0 flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-black/80 border border-white/10 flex-1 min-h-0">
              <video ref={videoRef} className="w-full h-full object-contain" playsInline muted />
              {(isStarting || error) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="text-center">
                    {isStarting && <div className="text-sm font-semibold text-white">Starting camera…</div>}
                    {error && <div className="text-sm font-semibold text-white">{error}</div>}
                    {!isStarting && error && (
                      <div className="mt-2 text-xs text-white/80">Check permissions and try again.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-between gap-3 pb-[env(safe-area-inset-bottom)]">
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Captures a compressed photo for vision chat.
              </div>
              <Button
                onClick={() => {
                  const video = videoRef.current;
                  if (!video || !video.videoWidth || !video.videoHeight) return;

                  const mimeType = 'image/jpeg';
                  const maxDim = 1280;
                  const target = clampSize(video.videoWidth, video.videoHeight, maxDim);
                  const canvas = document.createElement('canvas');
                  canvas.width = target.width;
                  canvas.height = target.height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                  let quality = 0.88;
                  let dataUrl = canvas.toDataURL(mimeType, quality);
                  const limitBytes = 5 * 1024 * 1024;
                  let tries = 0;
                  while (estimateDataUrlBytes(dataUrl) > limitBytes && tries < 4) {
                    quality = Math.max(0.55, quality - 0.1);
                    dataUrl = canvas.toDataURL(mimeType, quality);
                    tries += 1;
                  }

                  if (estimateDataUrlBytes(dataUrl) > limitBytes) {
                    alert('Photo is too large. Try again with a simpler shot or better lighting.');
                    return;
                  }

                  props.onCapture({
                    dataUrl,
                    mimeType,
                    name: `camera-${Date.now()}.jpg`,
                  });
                  props.onClose();
                }}
                disabled={!!error || isStarting}
                className="rounded-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take photo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
