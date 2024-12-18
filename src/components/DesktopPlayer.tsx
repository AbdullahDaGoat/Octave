/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Play, Pause, Volume2, Volume1, VolumeX, Music2, Info, Maximize2, X, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ListMusic,
  Cast, Airplay, Download, Library, Radio, UserPlus, Ban, Share, Star, Flag, AlertCircle, Lock, Mic2,
  Crown, Fan, CircleDollarSign, ListX, Plus, Disc, User
} from 'lucide-react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

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
  time: number;
  text: string;
}

type AudioQuality = 'MAX' | 'HIGH' | 'NORMAL' | 'DATA_SAVER';
type RepeatMode = 'off' | 'all' | 'one';

interface DesktopPlayerProps {
  currentTrack: Track | null;
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
  lyrics: Lyric[];
  currentLyricIndex: number;
  showLyrics: boolean;
  toggleLyricsView: () => void;
  shuffleOn: boolean;
  shuffleQueue: () => void;
  queue: Track[];
  currentTrackIndex: number;
  removeFromQueue: (_index: number) => void;
  onQueueItemClick: (track: Track, index: number) => void;
  setIsPlayerOpen: (_isOpen: boolean) => void;
}

function formatTimeDesktop(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const DesktopSeekbar: React.FC<{
  progress: number;
  handleSeek: (time: number) => void;
  duration: number;
}> = ({ progress, handleSeek, duration }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) setLocalProgress(progress);
  }, [progress, isDragging]);

  const calculateProgress = useCallback((clientX: number): number => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, ratio));
  }, []);

  const startDrag = useCallback((x: number) => {
    setIsDragging(true);
    setLocalProgress(calculateProgress(x));
  }, [calculateProgress]);

  const moveDrag = useCallback((x: number) => {
    if (!isDragging) return;
    setLocalProgress(calculateProgress(x));
  }, [isDragging, calculateProgress]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    handleSeek(localProgress * duration);
    setIsDragging(false);
  }, [isDragging, localProgress, duration, handleSeek]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX);
    const onTouchMove = (e: TouchEvent) => moveDrag(e.touches[0].clientX);
    const onEnd = () => endDrag();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, moveDrag, endDrag]);

  return (
    <div className="flex items-center w-full space-x-3 px-4 py-2">
      <span className="text-neutral-400 text-xs min-w-[40px] text-right">
        {formatTimeDesktop(localProgress * duration)}
      </span>
      <div 
        ref={progressRef}
        className="relative flex-1 h-1.5 bg-neutral-700/50 rounded-full cursor-pointer group backdrop-blur-sm"
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      >
        <div
          className="absolute left-0 top-0 h-full bg-white/90 rounded-full group-hover:bg-green-400 transition-colors"
          style={{ width: `${localProgress * 100}%` }}
        />
        <div 
          className="absolute -top-2 h-5 w-5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          style={{ left: `${localProgress * 100}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <span className="text-neutral-400 text-xs min-w-[40px]">
        {formatTimeDesktop(duration)}
      </span>
    </div>
  );
};

export default function DesktopPlayer({
  currentTrack,
  isPlaying,
  togglePlay,
  skipTrack,
  previousTrack,
  seekPosition,
  duration,
  handleSeek,
  isLiked,
  toggleLike,
  lyrics,
  currentLyricIndex,
  repeatMode,
  setRepeatMode,
  shuffleOn,
  shuffleQueue,
  queue,
  setQueue,
  onQueueItemClick,
  showLyrics,
  toggleLyricsView,
}: DesktopPlayerProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolume = useRef(volume);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('HIGH');
  const [tab, setTab] = useState<'queue' | 'lyrics' | 'details'>('queue');
  const [userScrollingLyrics, setUserScrollingLyrics] = useState(false);
  const userScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  

  const lyricsRef = useRef<HTMLDivElement>(null);

  const TABS = [
    { id: 'queue', label: 'Queue', icon: ListMusic },
    { id: 'lyrics', label: 'Lyrics', icon: Music2 },
    { id: 'details', label: 'Details', icon: Info }
  ] as const;

  const audioQualityIcons = {
    MAX: { icon: Crown, color: 'bg-gradient-to-r from-yellow-600 to-yellow-800', desc: 'HiFi Plus Quality (24-bit, up to 192kHz)' },
    HIGH: { icon: Star, color: 'bg-gradient-to-r from-purple-500 to-purple-700', desc: 'HiFi Quality (16-bit, 44.1kHz)' },
    NORMAL: { icon: Fan, color: 'bg-gradient-to-r from-blue-500 to-blue-700', desc: 'High Quality (320kbps AAC)' },
    DATA_SAVER: { icon: CircleDollarSign, color: 'bg-gradient-to-r from-green-500 to-green-700', desc: 'Data Saver (128kbps AAC)' },
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.contains(event.target as Node)) {
        setShowSidebar(false);
      }
    };
    if (showSidebar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSidebar]);

  const toggleMute = () => {
    setIsMuted((prev) => {
      if (prev) {
        setVolume(prevVolume.current || 1); // Restore previous volume
      } else {
        prevVolume.current = volume; // Save current volume before muting
        setVolume(0);
      }
      return !prev;
    });
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const VolumeIcon = () => {
    if (volume === 0 || isMuted) return <VolumeX />;
    if (volume < 0.5) return <Volume1 />;
    return <Volume2 />;
  };

  const cycleAudioQuality = () => {
    const order: AudioQuality[] = ['MAX', 'HIGH', 'NORMAL', 'DATA_SAVER'];
    const currentIndex = order.indexOf(audioQuality);
    const nextIndex = (currentIndex + 1) % order.length;
    setAudioQuality(order[nextIndex]);
  };

  const enterFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        // No-op
      });
    } else {
      document.exitFullscreen().then(() => {
        // No-op
      });
    }
  };

  const scrollToCurrentLyric = useCallback(() => {
    if (lyricsRef.current && currentLyricIndex >= 0) {
      const container = lyricsRef.current;
      const currentLyricElement = container.children[currentLyricIndex] as HTMLElement;
      if (currentLyricElement && !userScrollingLyrics) {
        const elementOffset = currentLyricElement.offsetTop;
        const containerHeight = container.clientHeight;
        const scrollPosition = elementOffset - containerHeight / 2;
        container.scrollTo({ top: scrollPosition > 0 ? scrollPosition : 0, behavior: 'smooth' });
      }
    }
  }, [currentLyricIndex, userScrollingLyrics]);
  

  useEffect(() => {
    if (tab === 'lyrics') {
      scrollToCurrentLyric();
    }
  }, [currentLyricIndex, tab, scrollToCurrentLyric]);

  // Handle user scroll - if user doesn't scroll for 1-2 seconds, auto scroll
  const handleLyricsScroll = () => {
    setUserScrollingLyrics(true);
    if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
    userScrollTimeout.current = setTimeout(() => {
      setUserScrollingLyrics(false);
      scrollToCurrentLyric();
    }, 1500);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-black/60 to-black/90 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-screen-2xl mx-auto px-4">
          <DesktopSeekbar
            progress={duration > 0 ? seekPosition / duration : 0}
            handleSeek={handleSeek}
            duration={duration}
          />

          <div className="h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {currentTrack && (
                <>
                  <div className="relative group">
                    <img 
                      src={currentTrack.album.cover_medium}
                      alt={currentTrack.title}
                      className="w-14 h-14 rounded-md object-cover"
                    />
                    <button 
                      onClick={() => {
                        setShowSidebar(true);
                        setTab('details');
                      }}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Info className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-medium truncate">{currentTrack.title}</h3>
                    <p className="text-neutral-400 text-sm truncate">{currentTrack.artist.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={toggleLike}
                      className={`p-2 rounded-full hover:bg-white/10 ${isLiked ? 'text-green-400' : 'text-neutral-400'}`}
                    >
                      <Heart className="w-5 h-5" />
                    </button>
                    <button
                      onClick={enterFullScreen}
                      className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={shuffleQueue}
                  className={`p-2 rounded-full hover:bg-white/10 ${
                    shuffleOn ? 'text-green-400' : 'text-neutral-400'
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button 
                  onClick={previousTrack}
                  className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-black" />
                  ) : (
                    <Play className="w-5 h-5 text-black translate-x-0.5" />
                  )}
                </button>
                <button
                  onClick={skipTrack} 
                  className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
                  className={`p-2 rounded-full hover:bg-white/10 ${
                    repeatMode !== 'off' ? 'text-green-400' : 'text-neutral-400'
                  }`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <button 
                onClick={() => {
                  setShowSidebar(true);
                  setTab('lyrics');
                }} 
                className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
              >
                <Music2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setShowSidebar(true);
                  setTab('queue');
                }} 
                className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
              >
                <ListMusic className="w-5 h-5" />
              </button>

              {/* Audio Quality Button */}
              <button
                onClick={cycleAudioQuality}
                className="p-2 rounded-full hover:bg-white/10 text-white flex items-center justify-center"
              >
                {React.createElement(audioQualityIcons[audioQuality].icon, {className: 'w-5 h-5'})}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
                >
                  <VolumeIcon />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-white"
                />

              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-50"
          >
            <motion.div
              id="sidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 40, stiffness: 400 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-[500px] bg-neutral-900 border-l border-white/10"
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                          t.id === tab ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <t.icon className="w-5 h-5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <SimpleBar style={{ maxHeight: '100%' }} className="h-full">
                    {tab === 'queue' && (
                      <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-medium">Queue</h3>
                          <button
                            onClick={() => setQueue([])}
                            className="text-sm text-neutral-400 hover:text-white"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="space-y-2">
                          {queue.map((track, index) => (
                            <div
                              key={`${track.id}-${index}`}
                              onClick={() => onQueueItemClick(track, index)}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                                currentTrack?.id === track.id ? 'bg-white/10' : 'hover:bg-white/5'
                              }`}
                            >
                              <img
                                src={track.album.cover_small}
                                alt={track.title}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{track.title}</p>
                                <p className="text-sm text-neutral-400 truncate">
                                  {track.artist.name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {tab === 'lyrics' && (
                      <div 
                        className="p-4 h-full overflow-y-auto"
                        ref={lyricsRef}
                        onScroll={handleLyricsScroll}
                      >
                        {lyrics.length > 0 ? (
                          <div className="space-y-4">
                            {lyrics.map((lyric, index) => (
                              <p
                                key={index}
                                onClick={() => handleSeek(lyric.time)}
                                className={`text-lg cursor-pointer transition-colors ${
                                  index === currentLyricIndex
                                    ? 'text-white font-medium'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                {lyric.text}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-center">No lyrics available</p>
                        )}
                      </div>
                    )}
                    {tab === 'details' && currentTrack && (
                      <div className="p-4 space-y-6">
                        <div>
                          <img
                            src={currentTrack.album.cover_xl}
                            alt={currentTrack.title}
                            className="w-full aspect-square rounded-lg object-cover"
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <h2 className="text-2xl font-bold text-white">{currentTrack.title}</h2>
                            <p className="text-neutral-400">{currentTrack.artist.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="flex-1 py-2.5 px-4 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors">
                              Add to Playlist
                            </button>
                            <button className="p-2.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors">
                              <Share className="w-5 h-5 text-white" />
                            </button>
                          </div>
                          <div className="pt-4 border-t border-white/10">
                            <h3 className="text-white font-medium mb-2">About</h3>
                            <div className="space-y-2 text-sm">
                              <p className="text-neutral-400">
                                Album • {currentTrack.album.title}
                              </p>
                              <p className="text-neutral-400">
                                Duration • {formatTimeDesktop(duration)}
                              </p>
                            </div>
                          </div>

                          {/* Additional icons section */}
                          <div className="pt-4 border-t border-white/10">
                            <h3 className="text-white font-medium mb-2">Actions</h3>
                            <div className="flex flex-wrap gap-2">
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Download className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Library className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Radio className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <UserPlus className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Ban className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Star className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Flag className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <AlertCircle className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Lock className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Mic2 className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Plus className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Disc className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <User className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <ListX className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Cast className="w-5 h-5" />
                              </button>
                              <button className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
                                <Airplay className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Volume control in details tab as well */}
                          <div className="pt-4 border-t border-white/10">
                            <h3 className="text-white font-medium mb-2">Volume</h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={toggleMute}
                                className="p-2 rounded-full hover:bg-white/10 text-neutral-400"
                              >
                                {isMuted ? <VolumeX /> : volume === 0 ? <VolumeX /> : volume < 0.5 ? <Volume1 /> : <Volume2 />}
                              </button>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                  const newVolume = parseFloat(e.target.value);
                                  setVolume(newVolume);
                                  setIsMuted(newVolume === 0);
                                }}
                                className="w-full accent-white"
                              />
                            </div>
                          </div>

                          {/* Audio Quality Info */}
                          <div className="pt-4 border-t border-white/10">
                            <h3 className="text-white font-medium mb-2">Audio Quality</h3>
                            <button 
                              onClick={cycleAudioQuality}
                              className={`inline-flex items-center space-x-2 px-4 py-1 rounded-full text-xs font-medium ${audioQualityIcons[audioQuality].color} text-white`}
                            >
                              {React.createElement(audioQualityIcons[audioQuality].icon, {className: 'w-4 h-4'})}
                              <span>{audioQuality}</span>
                            </button>
                            <p className="text-sm text-neutral-400 mt-2">{audioQualityIcons[audioQuality].desc}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </SimpleBar>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}