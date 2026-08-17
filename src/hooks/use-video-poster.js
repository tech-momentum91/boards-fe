import { useEffect, useRef, useState } from 'react';

const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(\?|#|$)/i;

export function isVideoFileUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return VIDEO_URL_PATTERN.test(url.split('#')[0]);
}

export function shouldUseVideoPoster(url, mediaType) {
  if (!url) return false;
  if (isVideoFileUrl(url)) return true;
  return mediaType === 'Video';
}

/**
 * Defers loading a video preview until the thumbnail is near the viewport.
 */
export function useVideoPoster(_videoUrl, enabled = true) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !inView) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    setReady(false);
    setFailed(false);

    const seekToPreviewFrame = () => {
      const duration = video.duration;
      const target =
        Number.isFinite(duration) && duration > 0 ? Math.min(0.5, duration * 0.05) : 0.1;
      try {
        video.currentTime = target;
      } catch {
        setReady(true);
      }
    };

    const onSeeked = () => setReady(true);
    const onError = () => setFailed(true);

    video.addEventListener('loadeddata', seekToPreviewFrame, { once: true });
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError, { once: true });

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      seekToPreviewFrame();
    }

    return () => {
      video.removeEventListener('loadeddata', seekToPreviewFrame);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
  }, [enabled, inView, _videoUrl]);

  const loading = enabled && inView && !ready && !failed;

  return { containerRef, videoRef, inView, ready, failed, loading };
}
