/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
import React, {
  useState,
  useEffect,
  useRef,
  SVGProps,
  useCallback,
  useMemo
} from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import {
  Heart, Play, Pause, SkipBack, SkipForward, ChevronDown,
  Music, Download, Share2, Radio, Plus, Library,
  Shuffle, Repeat, Repeat1, Mic2, ListMusic,
  ArrowLeft, MoreHorizontal, Cast, Airplay,
  Ban, Crown, Fan, CircleDollarSign, 
  Share, Star, Flag, AlertCircle, Lock, UserPlus, Trash2,
  ListX, Guitar
} from 'lucide-react';
import debounce from 'lodash/debounce';

interface Track {
  id: string;
  title: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_medium: string;
    cover_small: string;
    cover_big: string;
    cover_xl: string;
  };
}


interface Lyric {
  time: number; // Start time in seconds
  endTime?: number; // End time in seconds
  text: string;
}
type AudioQuality = 'MAX' | 'HIGH' | 'NORMAL' | 'DATA_SAVER';
type RepeatMode = 'off' | 'all' | 'one';

interface MobilePlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  previousTracks: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  togglePlay: () => void;
  skipTrack: () => void | Promise<void>;
  previousTrack: () => void;
  seekPosition: number;
  duration: number;
  handleSeek: (time: number) => void;
  isLiked: boolean;
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleLike: () => void;
  removeFromQueue: (index: number) => void;
  lyrics: Lyric[];
  currentLyricIndex: number;
  showLyrics: boolean;
  toggleLyricsView: () => void;
  shuffleOn: boolean;
  shuffleQueue: () => void;
  queue: Track[];
  currentTrackIndex: number;
  onQueueItemClick: (track: Track, index: number) => void;
  setIsPlayerOpen: (isOpen: boolean) => void;
  listenCount: number;
}

interface SeekbarProps {
  progress: number;
  handleSeek: (time: number) => void;
  isMiniplayer?: boolean;
  duration: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Seekbar: React.FC<SeekbarProps> = ({
  progress,
  handleSeek,
  isMiniplayer = false,
  duration,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const calculateProgress = useCallback((clientX: number): number => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    const newProgress = calculateProgress(clientX);
    setLocalProgress(newProgress);
  };

  const handleDragMove = useCallback((clientX: number) => {
    if (isDragging) {
      const newProgress = calculateProgress(clientX);
      setLocalProgress(newProgress);
    }
  }, [isDragging, calculateProgress]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      handleSeek(localProgress * duration);
      setIsDragging(false);
    }
  }, [isDragging, handleSeek, localProgress, duration]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX);
    const handleEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div className="mx-4 relative">
      <div
        ref={progressRef}
        className={`relative w-full ${isMiniplayer ? 'h-0.5' : 'h-1'} cursor-pointer rounded-full bg-white/20`}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      >
        <motion.div
          className="absolute left-0 top-0 h-full bg-white rounded-full"
          style={{ width: `${localProgress * 100}%` }}
          animate={{ width: `${localProgress * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
};

const QualityBadge: React.FC<{ quality: AudioQuality; onClick: () => void }> = ({ quality, onClick }) => {
  const icons = {
    MAX: Crown,
    HIGH: Star,
    NORMAL: Fan,
    DATA_SAVER: CircleDollarSign,
  };

  const qualityColors = {
    MAX: 'bg-gradient-to-r from-yellow-600 to-yellow-800',
    HIGH: 'bg-gradient-to-r from-purple-500 to-purple-700',
    NORMAL: 'bg-gradient-to-r from-blue-500 to-blue-700',
    DATA_SAVER: 'bg-gradient-to-r from-green-500 to-green-700',
  };

  const Icon = icons[quality];

  return (
    <motion.button
      className={`px-4 py-1 rounded-full text-xs font-medium ${qualityColors[quality]} text-white inline-flex items-center justify-center space-x-1.5`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <Icon className="w-3 h-3" />
      <span>{quality}</span>
    </motion.button>
  );
};

const ActionButton: React.FC<{
  icon: React.FC<SVGProps<SVGSVGElement>>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <motion.button
    className="flex flex-col items-center space-y-1"
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center
        ${active ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white/60'}
        transition-all duration-200 hover:bg-white/20`}
    >
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-xs text-white/60">{label}</span>
  </motion.button>
);

const MobilePlayer: React.FC<MobilePlayerProps> = ({
  currentTrack,
  isPlaying,
  togglePlay,
  setQueue,
  previousTracks,
  skipTrack,
  previousTrack,
  seekPosition,
  repeatMode,
  setRepeatMode,
  duration,
  handleSeek,
  isLiked,
  listenCount,
  toggleLike,
  lyrics,
  currentLyricIndex,
  showLyrics,
  toggleLyricsView,
  shuffleOn,
  shuffleQueue,
  queue,
  currentTrackIndex,
  removeFromQueue,
  onQueueItemClick,
  setIsPlayerOpen
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('MAX');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [showQueueUI, setShowQueueUI] = useState(false);
  const [miniPlayerTouchStartY, setMiniPlayerTouchStartY] = useState<number | null>(null);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoScrollingRef = useRef(false);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const [isSmallDevice, setIsSmallDevice] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState<{width: number; height: number}>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  const controls = useAnimation();

  // On small screens, no extra buttons are shown; on larger screens, show action buttons
  const actionButtons = [
    { icon: Heart, label: 'Like', active: isLiked, onClick: toggleLike },
    { icon: Plus, label: 'Add to', onClick: () => setShowAddToPlaylistModal(true) },
    { icon: Download, label: 'Download', onClick: () => console.log('Download') },
  ];

  const moreOptionsItems = [
    { icon: Heart, label: 'Like', active: isLiked, onClick: toggleLike },
    { icon: Ban, label: "Dislike", onClick: () => console.log('Blocked') },
    { icon: Share2, label: 'Share', onClick: () => console.log('Shared') },
    { icon: UserPlus, label: 'Follow', onClick: () => console.log('Following') },
    { icon: Radio, label: 'Start Radio', onClick: () => console.log('Started radio') },
    { icon: Library, label: 'Add to', onClick: () => setShowAddToPlaylistModal(true) },
    { icon: Share, label: 'Upload/Copy', onClick: () => console.log('Uploaded/Copied') },
    { icon: Music, label: 'Lyrics', active: showLyrics, onClick: toggleLyricsView },
    { icon: Flag, label: 'Report', onClick: () => console.log('Reported') },
    { icon: Download, label: 'Download', onClick: () => console.log('Download') },
    { icon: Lock, label: 'Audio Quality', onClick: () => setShowAudioMenu(true) },
    { icon: AlertCircle, label: 'Song Info', onClick: () => console.log('Info') },
    { icon: Mic2, label: 'Karaoke', onClick: () => console.log('Karaoke') },
    { icon: Library, label: 'N/A', onClick: () => console.log('Placeholder') },
  ];

  const getVisibleActionButtons = () => {
    const isVerySmallScreen = windowDimensions.height <= 667 || windowDimensions.width <= 375;
    if (isVerySmallScreen) {
      return [];
    }
    return actionButtons;
  };

  const handleUserScroll = () => {
    if (isAutoScrollingRef.current) {
      return;
    }

    setUserScrolling(true);

    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }

    userScrollTimeoutRef.current = setTimeout(() => {
      setUserScrolling(false);
    }, 3000);
  };

  const togglePlayer = () => {
    setIsExpanded(!isExpanded);
    setIsPlayerOpen(!isExpanded);
  };

  useEffect(() => {
    const extractColor = () => {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = currentTrack.album.cover_medium;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = 1;
          canvas.height = 1;
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          const color = `rgb(${r}, ${g}, ${b})`;
          setDominantColor(color);
        };

        img.onerror = () => {
          setDominantColor('#000000');
        };
      } catch {
        setDominantColor('#000000');
      }
    };

    if (currentTrack.album.cover_medium) {
      extractColor();
    }
  }, [currentTrack.album.cover_medium]);

  useEffect(() => {
    if (!showLyrics) return;
    const lyricsContainer = lyricsRef.current;
    if (!lyricsContainer || currentLyricIndex === -1) return;
  
    if (!userScrolling) {
      // Only scroll if the user is not currently scrolling manually
      const scrollToLyric = () => {
        const currentLyricElement = lyricsContainer.children[currentLyricIndex] as HTMLElement;
        if (currentLyricElement) {
          isAutoScrollingRef.current = true;
          const elementOffset = currentLyricElement.offsetTop;
          const elementHeight = currentLyricElement.offsetHeight;
          const containerHeight = lyricsContainer.clientHeight;
          const scrollPosition = elementOffset - (containerHeight / 2) + (elementHeight / 2);
  
          if (scrollPosition >= 0) {
            lyricsContainer.scrollTo({
              top: scrollPosition,
              behavior: 'smooth',
            });
          }
  
          setTimeout(() => {
            isAutoScrollingRef.current = false;
          }, 1000);
        }
      };
  
      // Slight delay to ensure layout is stable before scrolling
      const timeout = setTimeout(scrollToLyric, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentLyricIndex, showLyrics, userScrolling]);
  

  useEffect(() => {
    const checkViewportSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsSmallDevice(width <= 375 || height <= 667);
    };
    checkViewportSize();
    window.addEventListener('resize', checkViewportSize);
    return () => window.removeEventListener('resize', checkViewportSize);
  }, []);

  const handleMiniPlayerTouchStart = (e: React.TouchEvent) => {
    setMiniPlayerTouchStartY(e.touches[0].clientY);
  };

  const handleMiniPlayerTouchMove = (e: React.TouchEvent) => {
    if (miniPlayerTouchStartY !== null) {
      const deltaY = miniPlayerTouchStartY - e.touches[0].clientY;
      if (deltaY > 50) {
        setIsExpanded(true);
        setIsPlayerOpen(true); // Ensure navbar hides when swiping up to expand
        setMiniPlayerTouchStartY(null);
      }
    }
  };

  const handleMiniPlayerTouchEnd = () => {
    setMiniPlayerTouchStartY(null);
  };

  let backClickCount = 0;
  const handleBackClick = () => {
    backClickCount++;
    if (backClickCount === 1) {
      setTimeout(() => {
        if (backClickCount === 1) {
          if (seekPosition > 5) {
            handleSeek(0);
          } else {
            previousTrack();
          }
        }
        backClickCount = 0;
      }, 300);
    } else if (backClickCount === 2) {
      previousTrack();
      backClickCount = 0;
    }
  };

  let forwardClickCount = 0;
  const handleForwardClick = () => {
    forwardClickCount++;
    if (forwardClickCount === 1) {
      setTimeout(() => {
        if (forwardClickCount === 1) {
          const timeRemaining = duration - seekPosition;
          if (timeRemaining <= 5) {
            skipTrack();
          } else {
            handleSeek(duration);
          }
        }
        forwardClickCount = 0;
      }, 300);
    } else if (forwardClickCount === 2) {
      skipTrack();
      forwardClickCount = 0;
    }
  };

  const handleMiniPlayerDragEnd = (info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      controls.start({ x: '100%', transition: { duration: 0.3 } }).then(() => {
        previousTrack();
        controls.set({ x: '-100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else if (info.offset.x < -threshold) {
      controls.start({ x: '-100%', transition: { duration: 0.3 } }).then(() => {
        skipTrack();
        controls.set({ x: '100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300 } });
    }
  };

  const handleDragEnd = (info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      controls.start({ x: '100%', transition: { duration: 0.3 } }).then(() => {
        previousTrack();
        controls.set({ x: '-100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else if (info.offset.x < -threshold) {
      controls.start({ x: '-100%', transition: { duration: 0.3 } }).then(() => {
        skipTrack();
        controls.set({ x: '100%' });
        controls.start({ x: 0, transition: { duration: 0.3 } });
      });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300 } });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const processedLyrics = useMemo(() => {
    return lyrics.map((lyric, index) => ({
      ...lyric,
      endTime: lyrics[index + 1]?.time || duration, // Use track duration for the last lyric
    }));
  }, [lyrics, duration]);

  const getLyricProgress = () => {
    if (currentLyricIndex === -1 || !processedLyrics[currentLyricIndex]) return 0;
    
    const currentLyric = processedLyrics[currentLyricIndex];
    const lyricStart = currentLyric.time;
    const lyricEnd = currentLyric.endTime;
    const lyricDuration = lyricEnd - lyricStart;
    
    const elapsed = seekPosition - lyricStart;
    const progress = Math.min(Math.max(elapsed / lyricDuration, 0), 1);
    
    return progress;
  };
  
  const lyricProgress = getLyricProgress();
  

  const mainControlButtons = (
    <div className="w-full flex items-center justify-between mb-8">
      <button
        onClick={shuffleQueue}
        className={`p-3 rounded-full ${shuffleOn ? 'text-green-500' : 'text-white/60 hover:bg-white/10'}`}
      >
        <Shuffle className="w-6 h-6" />
      </button>

      <div className="flex items-center space-x-8">
        <button
          className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
          onClick={handleBackClick}
        >
          <SkipBack className="w-6 h-6 text-white" />
        </button>

        <motion.button
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors"
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="w-8 h-8 text-black" /> : <Play className="w-8 h-8 text-black ml-1" />}
        </motion.button>

        <button
          className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
          onClick={handleForwardClick}
        >
          <SkipForward className="w-6 h-6 text-white" />
        </button>
      </div>

      <button
        onClick={() => {
          const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
          setRepeatMode(nextMode);
        }}
        className="p-3 rounded-full"
      >
        {repeatMode === 'one' ? (
          <Repeat1 className="w-6 h-6 text-green-500" />
        ) : (
          <Repeat
            className={`w-6 h-6 ${repeatMode === 'all' ? 'text-green-500' : 'text-white/60'}`}
          />
        )}
      </button>
    </div>
  );

  return (
    <div className="px-6 flex flex-col items-center">
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-50">
        {!isExpanded && (
          <motion.div
            className="mx-2 rounded-xl overflow-hidden mb-[env(safe-area-inset-bottom)]"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, ${dominantColor}CC, rgba(0,0,0,0.95))`
                : 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(event, info) => handleMiniPlayerDragEnd(info)}
            animate={controls}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
              setIsPlayerOpen(true);
            }}
            onTouchStart={handleMiniPlayerTouchStart}
            onTouchMove={handleMiniPlayerTouchMove}
            onTouchEnd={handleMiniPlayerTouchEnd}
          >
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <motion.div className="relative w-12 h-12 rounded-lg overflow-hidden" whileHover={{ scale: 1.05 }}>
                    <img src={currentTrack.album.cover_medium} alt={currentTrack.title} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{currentTrack.title}</div>
                    <p className="text-white/60 text-sm truncate">{currentTrack.artist.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 justify-center">
                  <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBackClick();
                    }}
                  >
                    <SkipBack className="w-5 h-5 text-white" />
                  </button>

                  <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                  </button>

                  <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleForwardClick();
                    }}
                  >
                    <SkipForward className="w-5 h-5 text-white" />
                  </button>

                  <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike();
                    }}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-green-500 text-green-500' : 'text-white/60'}`} />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <Seekbar progress={seekPosition / duration} handleSeek={handleSeek} duration={duration} isMiniplayer />
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className={`fixed inset-0 z-50 flex flex-col pb-[env(safe-area-inset-bottom)] ${isSmallDevice ? '' : 'justify-center'}`}
              style={{
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-4">
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={togglePlayer}
                >
                  <ChevronDown className="w-6 h-6 text-white" />
                </button>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Cast className="w-5 h-5 text-white/60" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Airplay className="w-5 h-5 text-white/60" />
                  </button>
                  <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={() => setShowQueueUI(true)}
                  >
                    <ListMusic className="w-5 h-5 text-white/60" />
                  </button>
                  {isSmallDevice && (
                    <button
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      onClick={() => setShowMoreOptions(true)}
                    >
                      <MoreHorizontal className="w-5 h-5 text-white/60" />
                    </button>
                  )}
                </div>
              </div>

              <div className={`px-4 flex-grow flex flex-col items-center ${isSmallDevice ? '' : 'justify-center min-h-0'}`}>
                {showLyrics ? (
                  <div className="h-[calc(100vh-10vh)] w-full overflow-y-auto" onScroll={handleUserScroll}>
                    <div className="flex items-center mb-6">
                      <button
                        onClick={toggleLyricsView}
                        className="hover:bg-white/10 p-2 rounded-full transition-colors"
                      >
                        <ArrowLeft className="w-6 h-6 text-white" />
                      </button>
                      <h2 className="text-lg font-semibold text-white ml-4">Lyrics</h2>
                    </div>
                    <div 
                      className="space-y-6 overflow-y-auto"
                      ref={lyricsRef}
                      style={{ height: 'calc(100% - 4rem)' }}
                    >
                      {processedLyrics.map((lyric, index) => {
                        const isActive = index === currentLyricIndex;

                        if (!isActive) {
                          return (
                            <motion.p
                              key={index}
                              className={`text-lg text-center transition-all duration-300 ${
                                isActive
                                  ? 'text-white scale-105 font-bold'
                                  : 'text-white/40 hover:text-white opacity-50'
                              }`}
                              onClick={() => handleSeek(lyric.time)}
                            >
                              {lyric.text}
                            </motion.p>
                          );
                        }

                        // For the active lyric, split into letters and apply fill based on progress
                        const letters = lyric.text.split('');
                        const totalLetters = letters.length;
                        const filledLetters = Math.floor(lyricProgress * totalLetters);

                        return (
                          <motion.p
                            key={index}
                            className="text-lg text-center font-bold text-white"
                            onClick={() => handleSeek(lyric.time)}
                          >
                            {letters.map((letter, idx) => (
                              <span
                                key={idx}
                                className={`transition-colors duration-300 ${
                                  idx < filledLetters ? 'text-white' : 'text-white/40'
                                }`}
                              >
                                {letter}
                              </span>
                            ))}
                          </motion.p>
                        );
                      })}
                    </div>
                  </div>
                ) : showQueueUI ? (
                  <div className="h-[calc(100vh-15vh)] w-full overflow-y-auto"
                    style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <button
                          onClick={() => setShowQueueUI(false)}
                          className="hover:bg-white/10 p-2 rounded-full transition-colors"
                        >
                          <ArrowLeft className="w-6 h-6 text-white" />
                        </button>
                        <h2 className="text-lg font-semibold text-white ml-4">Up Next</h2>
                      </div>
                      <button
                        onClick={() => setQueue([])}
                        className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-full hover:bg-white/20"
                      >
                        <ListX className="w-5 h-5 text-white" />
                        <span className="text-sm text-white">Clear Queue</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {previousTracks.map((track, index) => (
                        <motion.div
                          key={`prev-${track.id}-${index}`}
                          className="flex items-center space-x-4 p-2 rounded-lg opacity-50 hover:opacity-70 transition-opacity cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onQueueItemClick(track, -1 * (index + 1))}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden">
                            <img src={track.album.cover_medium} alt={track.title} className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-400 font-medium truncate">{track.title}</p>
                            <p className="text-gray-500 text-sm truncate">{track.artist.name}</p>
                          </div>
                          <button className="p-2 rounded-full">
                            <MoreHorizontal className="w-5 h-5 text-gray-500" />
                          </button>
                        </motion.div>
                      ))}

                      {queue.map((track, index) => (
                        <AnimatePresence key={`queue-${track.id}-${index}`}>
                          <motion.div className="relative">
                            <motion.div
                              className="relative bg-black"
                              drag="x"
                              dragConstraints={{ left: 0, right: 0 }}
                              dragElastic={0.2}
                              onDragEnd={(event, info: PanInfo) => {
                                if (info.offset.x < -100) {
                                  removeFromQueue(index);
                                }
                              }}
                            >
                              <div
                                className={`flex items-center space-x-4 p-2 rounded-lg bg-black ${
                                  track.id === currentTrack.id ? 'bg-white/10' : 'hover:bg-white/10'
                                }`}
                                onClick={() => onQueueItemClick(track, index)}
                              >
                                <div className="w-12 h-12 relative rounded-lg overflow-hidden">
                                  <img src={track.album.cover_medium} alt={track.title} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">{track.title}</p>
                                  <p className="text-white/60 text-sm truncate">{track.artist.name}</p>
                                </div>
                                <button
                                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoreOptions(true);
                                  }}
                                >
                                  <MoreHorizontal className="w-5 h-5 text-white/60" />
                                </button>
                              </div>
                            </motion.div>
                          </motion.div>
                        </AnimatePresence>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`relative w-full h-[min(60vw,320px)] flex justify-center items-center mb-8 flex-shrink-0`}>
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${currentTrack.album.cover_medium})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'blur(20px)',
                          transform: 'scale(1.2)',
                          zIndex: -1,
                        }}
                      ></div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(event, info) => handleDragEnd(info)}
                        className="relative z-10"
                      >
                        <img
                          src={currentTrack.album.cover_medium}
                          alt={currentTrack.title}
                          className="rounded-lg shadow-xl"
                        />
                      </motion.div>
                    </div>

                    <div className="w-full text-center mb-8">
                      <h2 className={`${isSmallDevice ? 'text-xl' : 'text-2xl'} font-bold text-white mb-2`}>
                        {currentTrack.title}
                      </h2>
                      <p className="text-white/60">{currentTrack.artist.name}</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <QualityBadge quality={audioQuality} onClick={() => setShowAudioMenu(true)} />
                      <p className="text-[#FFD700] text-xs mt-1 flex items-center space-x-1">
                        <Guitar className="w-4 h-4 inline-block" />
                        <span>Listened to {listenCount} times</span>
                      </p>
                    </div>

                    <div className="w-full mb-8 mt-6">
                      <Seekbar
                        progress={seekPosition / duration}
                        handleSeek={handleSeek}
                        duration={duration}
                      />
                      <div className="flex justify-between text-sm text-white/60 mt-2">
                        <span>{formatTime(seekPosition)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {mainControlButtons}

                    {getVisibleActionButtons().length > 0 && (
                      <div className="w-full flex flex-wrap justify-center gap-8 mb-4">
                        {getVisibleActionButtons().map((btn, index) => (
                          <ActionButton
                            key={index}
                            icon={btn.icon}
                            label={btn.label}
                            active={btn.active}
                            onClick={btn.onClick}
                          />
                        ))}
                        <div className="md:flex">
                          <ActionButton
                            icon={MoreHorizontal}
                            label="More"
                            onClick={() => setShowMoreOptions(true)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <AnimatePresence>
                {showAudioMenu && (
                  <motion.div
                    className="fixed inset-0 bg-black/80 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAudioMenu(false)}
                  >
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 rounded-t-3xl"
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                        <h3 className="text-lg font-bold text-white mb-4 text-center">Audio Quality</h3>

                        {(['MAX', 'HIGH', 'NORMAL', 'DATA_SAVER'] as AudioQuality[]).map((quality) => (
                          <button
                            key={quality}
                            className={`w-full flex items-center justify-between p-4 rounded-lg mb-2 transition-all
                              ${audioQuality === quality ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            onClick={() => {
                              setAudioQuality(quality);
                              setShowAudioMenu(false);
                            }}
                          >
                            <div className="flex flex-col items-start justify-center">
                              <p className="text-white font-semibold leading-none">{quality}</p>
                              <p className="text-sm text-white/60 leading-none mt-1">
                                {quality === 'MAX' && 'HiFi Plus Quality (24-bit, up to 192kHz)'}
                                {quality === 'HIGH' && 'HiFi Quality (16-bit, 44.1kHz)'}
                                {quality === 'NORMAL' && 'High Quality (320kbps AAC)'}
                                {quality === 'DATA_SAVER' && 'Data Saver (128kbps AAC)'}
                              </p>
                            </div>
                            {quality === audioQuality && (
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <motion.div
                                  className="w-3 h-3 bg-white rounded-full"
                                  layoutId="quality-indicator"
                                />
                              </div>
                            )}
                          </button>
                        ))}

                        <button
                          className="w-full py-4 text-white/60 hover:text-white transition-colors mt-4 text-center"
                          onClick={() => setShowAudioMenu(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showMoreOptions && (
                  <motion.div
                    className="fixed inset-0 bg-black/80 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMoreOptions(false)}
                  >
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 rounded-t-3xl max-h-[80%] overflow-y-auto"
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

                        <div className={`grid ${isSmallDevice ? 'grid-cols-3' : 'grid-cols-4'} gap-4 mb-8`}>
                          {moreOptionsItems.map((item, index) => (
                            <ActionButton
                              key={index}
                              icon={item.icon}
                              label={item.label}
                              active={item.active}
                              onClick={() => {
                                item.onClick?.();
                                setShowMoreOptions(false);
                              }}
                            />
                          ))}
                          {isSmallDevice &&
                            actionButtons.slice(3).map((btn, index) => (
                              <ActionButton
                                key={`additional-${index}`}
                                icon={btn.icon}
                                label={btn.label}
                                active={btn.active}
                                onClick={() => {
                                  btn.onClick?.();
                                  setShowMoreOptions(false);
                                }}
                              />
                            ))}
                        </div>

                        <button
                          className="w-full py-4 text-white/60 hover:text-white transition-colors"
                          onClick={() => setShowMoreOptions(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Minimal styling for thumb on seekbar already covered */
      `}</style>
    </div>
  );
};

export default MobilePlayer;
