"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ExpenseCameraCaptureProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export function ExpenseCameraCapture({
  open,
  onClose,
  onCapture,
}: ExpenseCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsReady(false);
      return;
    }

    let cancelled = false;
    const video = videoRef.current;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported in this browser. Use Upload file instead.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
          setIsReady(true);
        }
      } catch {
        setError(
          "Could not open the camera. Allow camera access in your browser, or use Upload file.",
        );
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video) {
        video.srcObject = null;
      }
    };
  }, [open]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `receipt-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-900/60 p-4 sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">Take photo</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
        </header>

        <div className="bg-zinc-950 p-4">
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-4 text-sm text-red-700">{error}</p>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                "aspect-[4/3] w-full rounded-lg bg-black object-cover",
                !isReady && "opacity-40",
              )}
            />
          )}
        </div>

        <footer className="flex gap-2 border-t border-zinc-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isReady || !!error}
            onClick={handleCapture}
            className="flex-1 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Capture
          </button>
        </footer>
      </div>
    </div>
  );
}
