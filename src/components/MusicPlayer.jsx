import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';

export function MusicPlayer({
  src,
  title = 'Nuestra canción',
  artist = '',
  autoPlay = false,
  loop = true,
  volume = 0.5,
  className = '',
  onPlay,
  onPause,
  onEnded,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(volume);
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handlePlay = () => {
      onPlay?.();
    };

    const handlePause = () => {
      onPause?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Auto-play si está permitido
    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play bloqueado, esperar interacción del usuario
        });
      }
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, [src, loop, volume, autoPlay, onPlay, onPause, onEnded]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => {});
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setVolumeLevel(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volumeLevel;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`relative ${className}`}>
      {/* Botón flotante colapsado */}
      <button
        onClick={() => setShowPlayer(!showPlayer)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full
          bg-white/90 backdrop-blur-sm shadow-paperLift
          border-2 border-heart/20
          flex items-center justify-center
          transition-all duration-300
          hover:scale-110 hover:shadow-paperLift hover:border-heart/40
          ${isPlaying ? 'animate-heartbeat' : ''}
        `}
        aria-label={isPlaying ? 'Pausar música' : 'Reproducir música'}
        aria-expanded={showPlayer}
      >
        <span className={isPlaying ? 'text-heart text-2xl' : 'text-heart text-2xl'}>
          {isPlaying ? '❤️' : '🎵'}
        </span>
        {showPlayer && (
          <span className="absolute -right-64 top-1/2 -translate-y-1/2 w-60 bg-white/95 backdrop-blur-sm rounded-xl shadow-paperLift border border-heart/20 p-3 text-center text-xs font-mono text-inkLight/60 animate-fade-in-scale">
            Click para cerrar
          </span>
        )}
      </button>

      {/* Panel expandido */}
      {showPlayer && (
        <div
          className={`
            fixed bottom-24 right-6 z-50 w-80 sm:w-96
            bg-white/95 backdrop-blur-sm rounded-2xl shadow-paperLift
            border-2 border-heart/20 p-4
            animate-fade-in-up
          `}
          role="region"
          aria-label="Reproductor de música"
        >
          <div className="flex items-start gap-3 mb-3">
            {/* Portada de la canción */}
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-heart/20 to-accent-1/20 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              <span className="text-3xl animate-float">🎵</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-handwritingBold text-ink text-sm truncate">{title}</p>
              {artist && <p className="font-mono text-xs text-inkLight/60 truncate">{artist}</p>}
            </div>

            {/* Botón cerrar */}
            <button
              onClick={() => setShowPlayer(false)}
              className="p-1 rounded-lg hover:bg-heart/10 transition-colors text-inkLight/50 hover:text-heart"
              aria-label="Cerrar reproductor"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Barra de progreso */}
          <div className="mb-3">
            <div
              ref={progressRef}
              className="relative h-2 bg-heart/10 rounded-full cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
              role="slider"
              aria-label="Progreso de la canción"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (!audioRef.current) return;
                const step = duration / 100;
                if (e.key === 'ArrowRight') {
                  audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + step * 5);
                } else if (e.key === 'ArrowLeft') {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - step * 5);
                }
              }}
            >
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-heart to-accent-1 rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-heart transform -translate-x-1/2 transition-transform duration-100"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-inkLight/60 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg hover:bg-heart/10 transition-colors text-inkLight/60 hover:text-heart"
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <button
              onClick={togglePlay}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-heart text-white font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-heart/30"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  <span className="font-mono text-xs">PAUSA</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  <span className="font-mono text-xs">PLAY</span>
                </>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volumeLevel}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-heart/10 rounded-full appearance-none cursor-pointer accent-heart"
              aria-label="Volumen"
            />
          </div>

          {/* Visualizador simple */}
          {isPlaying && (
            <div className="mt-3 flex items-end justify-center gap-1 h-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-heart to-accent-1 rounded-t animate-bounce"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    height: `${20 + Math.random() * 60}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente simplificado para usar en línea
export function MiniPlayer({ src, title, className = '', ...props }) {
  return (
    <MusicPlayer
      src={src}
      title={title}
      className={className}
      {...props}
    />
  );
}