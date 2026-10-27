"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Hls from "hls.js";
import { useEventListener } from "usehooks-ts";
import { FullScreenControl } from "./fullscreen-control";
import { VolumeControl } from "./volume-control";

interface LiveVideoProps {
  playbackUrl: string;
}

export function LiveVideo({ playbackUrl }: LiveVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Empieza en mute: Chrome bloquea autoplay con audio y deja el video negro.
  const [volume, setVolume] = useState(0);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    setError(null);
    setNeedsGesture(false);
    hlsRef.current?.destroy();
    hlsRef.current = null;

    video.muted = true;
    video.playsInline = true;

    const tryPlay = async () => {
      try {
        await video.play();
        setNeedsGesture(false);
      } catch {
        setNeedsGesture(true);
      }
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl;
      void tryPlay();
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveDurationInfinity: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void tryPlay();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
        setError("No se pudo reproducir el HLS. Revisa MediaMTX en :8888.");
        hls.destroy();
      });
    } else {
      setError("Este navegador no soporta HLS.");
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [playbackUrl]);

  const onVolumeChange = (value: number) => {
    setVolume(+value);
    if (videoRef.current) {
      videoRef.current.muted = value === 0;
      videoRef.current.volume = Math.max(+value * 0.01, 0);
    }
  };

  const toggleMute = () => {
    const isMuted = volume === 0;
    const next = isMuted ? 50 : 0;
    setVolume(next);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      videoRef.current.volume = isMuted ? 0.5 : 0;
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else if (wrapperRef.current) {
      wrapperRef.current.requestFullscreen();
    }
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(document.fullscreenElement !== null);
  };

  const resumePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = volume === 0;
    try {
      await video.play();
      setNeedsGesture(false);
    } catch {
      setNeedsGesture(true);
    }
  };

  useEventListener(
    "fullscreenchange",
    handleFullscreenChange,
    wrapperRef as RefObject<HTMLDivElement>
  );

  return (
    <div ref={wrapperRef} className="relative aspect-video w-full bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        playsInline
        autoPlay
        muted
      />
      {(needsGesture || error) && (
        <button
          type="button"
          onClick={() => void resumePlayback()}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-sm font-medium text-white"
        >
          {error ?? "Clic para ver la transmisión"}
        </button>
      )}
      <div className="absolute top-0 h-full w-full opacity-0 hover:opacity-100 hover:transition-all pointer-events-none">
        <div className="absolute bottom-0 flex h-14 w-full items-center justify-between bg-gradient-to-r from-neutral-900 px-4 pointer-events-auto">
          <VolumeControl onChange={onVolumeChange} value={volume} onToggle={toggleMute} />
          <FullScreenControl isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
        </div>
      </div>
    </div>
  );
}
