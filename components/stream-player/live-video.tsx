"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Hls from "hls.js";
import { useEventListener } from "usehooks-ts";
import { FullScreenControl } from "./fullscreen-control";
import { VolumeControl } from "./volume-control";
import { useStreamMetricsStore } from "@/store/use-stream-metrics";

interface LiveVideoProps {
  playbackUrl: string;
}

export function LiveVideo({ playbackUrl }: LiveVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const setLatencySec = useStreamMetricsStore((s) => s.setLatencySec);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(0);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    let cancelled = false;
    let latencyTimer: number | undefined;
    setError(null);
    setNeedsGesture(false);
    setLoading(true);
    setLatencySec(null);
    hlsRef.current?.destroy();
    hlsRef.current = null;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const tryPlay = async () => {
      if (cancelled) return;
      try {
        video.muted = true;
        await video.play();
        if (!cancelled) {
          setNeedsGesture(false);
          if (video.videoWidth > 0) setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setNeedsGesture(true);
          setLoading(false);
        }
      }
    };

    const showFrame = () => {
      if (cancelled || video.videoWidth <= 0) return;
      setLoading(false);
      setError(null);
    };
    video.addEventListener("loadeddata", showFrame);
    video.addEventListener("resize", showFrame);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl;
      video.addEventListener("loadedmetadata", () => void tryPlay(), { once: true });
      void tryPlay();
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 40,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 6,
        maxLiveSyncPlaybackRate: 1.5,
        startPosition: -1,
      });
      hlsRef.current = hls;

      const seekIntoBuffer = () => {
        const edge = hls.liveSyncPosition;
        if (edge == null || !Number.isFinite(edge)) return;
        const buffered = video.buffered;
        for (let i = 0; i < buffered.length; i++) {
          if (video.currentTime >= buffered.start(i) && video.currentTime < buffered.end(i) - 0.25) {
            return;
          }
        }
        try {
          video.currentTime = edge;
        } catch {
          // el video todavía no acepta seek
        }
      };

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        seekIntoBuffer();
        void tryPlay();
      });
      hls.on(Hls.Events.FRAG_BUFFERED, (_event, data) => {
        if (cancelled || data.frag.type === "audio") return;
        seekIntoBuffer();
        void tryPlay();
        showFrame();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || cancelled) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          seekIntoBuffer();
          return;
        }
        setLoading(false);
        setError("No se pudo reproducir el video. ¿OBS sigue transmitiendo?");
        hls.destroy();
      });

      latencyTimer = window.setInterval(() => {
        if (cancelled) return;
        let latency: number | null = null;
        if (typeof hls.latency === "number" && Number.isFinite(hls.latency)) {
          latency = hls.latency;
        } else if (
          typeof hls.liveSyncPosition === "number" &&
          Number.isFinite(hls.liveSyncPosition) &&
          Number.isFinite(video.currentTime)
        ) {
          latency = Math.max(0, hls.liveSyncPosition - video.currentTime);
        }
        setLatencySec(latency);
      }, 2000);
    } else {
      setLoading(false);
      setError("Este navegador no soporta HLS.");
    }

    return () => {
      cancelled = true;
      if (latencyTimer) window.clearInterval(latencyTimer);
      setLatencySec(null);
      video.removeEventListener("loadeddata", showFrame);
      video.removeEventListener("resize", showFrame);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [playbackUrl, setLatencySec]);

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
    if (isFullscreen) document.exitFullscreen();
    else wrapperRef.current?.requestFullscreen();
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(document.fullscreenElement !== null);
  };

  const resumePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    video.muted = true;
    try {
      if (hlsRef.current && video.readyState < 2) {
        hlsRef.current.startLoad();
      }
      await video.play();
      setNeedsGesture(false);
      setLoading(false);
      if (volume > 0) {
        video.muted = false;
        video.volume = volume * 0.01;
      }
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
    <div ref={wrapperRef} className="relative h-full min-h-[240px] w-full bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        playsInline
        autoPlay
        muted
        controls={false}
      />
      {loading && !needsGesture && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-sm text-white">
          Cargando transmisión…
        </div>
      )}
      {(needsGesture || error) && (
        <button
          type="button"
          onClick={() => void resumePlayback()}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-4 text-center text-sm font-medium text-white"
        >
          {error ?? "Clic para ver la transmisión"}
        </button>
      )}
      <div className="absolute inset-0 z-10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-0 flex h-14 w-full items-center justify-between bg-gradient-to-r from-neutral-900/90 px-4 pointer-events-auto">
          <VolumeControl onChange={onVolumeChange} value={volume} onToggle={toggleMute} />
          <FullScreenControl isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
        </div>
      </div>
    </div>
  );
}
