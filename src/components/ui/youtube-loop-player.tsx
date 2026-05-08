import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

// Declaração de tipos para a YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
  unMute: () => void;
  mute: () => void;
  isMuted: () => boolean;
}

interface YouTubeLoopPlayerProps {
  videoId: string;
  title?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface YouTubeLoopPlayerRef {
  unMute: () => void;
  mute: () => void;
}

/**
 * YouTube Player com replay automático (loop).
 * Usa a YouTube IFrame API para detectar quando o vídeo termina e reiniciar.
 * 
 * Parâmetros aplicados:
 * - rel=0: sem vídeos recomendados no fim
 * - modestbranding=1: marca mínima do YouTube
 * - fs=0: sem botão fullscreen
 * - disablekb=1: desativa atalhos de teclado
 * - playsinline=1: toca inline (mobile)
 * - controls=1: controles visíveis (play/pause)
 * - autoplay=1: autoplay
 * - mute=1: mudo (necessário para autoplay)
 */
const YouTubeLoopPlayer = forwardRef<YouTubeLoopPlayerRef, YouTubeLoopPlayerProps>(
  ({ videoId, title = "Vídeo", ariaLabel, className, style }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const isApiLoadedRef = useRef(false);

  // Expor métodos via ref para controle externo
  useImperativeHandle(ref, () => ({
    unMute: () => {
      playerRef.current?.unMute();
      playerRef.current?.playVideo();
    },
    mute: () => {
      playerRef.current?.mute();
    },
  }));

  const initializePlayer = useCallback(() => {
    if (!containerRef.current || !window.YT || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        rel: 0, // Sem recomendados no fim
        modestbranding: 1, // Marca mínima
        playsinline: 1, // Toca inline (mobile)
        controls: 1, // Controles visíveis
        autoplay: 1, // Autoplay
        mute: 1, // Mudo (necessário para autoplay)
        fs: 0, // Sem fullscreen
        disablekb: 1, // Desativa atalhos de teclado
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          // Player pronto, tenta autoplay
          event.target.playVideo();
        },
        onStateChange: (event) => {
          // Quando o vídeo termina (state === 0), reinicia
          if (event.data === 0) {
            event.target.seekTo(0, true);
            event.target.playVideo();
          }
        },
      },
    });
  }, [videoId]);

  useEffect(() => {
    // Carrega a API do YouTube se ainda não foi carregada
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // Callback global que o YouTube chama quando a API está pronta
      window.onYouTubeIframeAPIReady = () => {
        isApiLoadedRef.current = true;
        initializePlayer();
      };
    } else if (!isApiLoadedRef.current) {
      isApiLoadedRef.current = true;
      initializePlayer();
    } else {
      initializePlayer();
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [initializePlayer]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      title={title}
      aria-label={ariaLabel || title}
      role="region"
    />
  );
  }
);

YouTubeLoopPlayer.displayName = "YouTubeLoopPlayer";

export default YouTubeLoopPlayer;
