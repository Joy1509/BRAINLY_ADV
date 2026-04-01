import React, { useRef, useState, useEffect, useCallback } from "react";

interface DetailModalProps {
  title: string;
  link: string;
  tags?: string[];
  summary?: string;
  icon?: string;
  audioUrl?: string;
  isShared?: boolean;
  onClose: () => void;
}

// Pitch-shifted player using Web Audio API (changes pitch, not speed)
const PitchedAudioPlayer = ({ audioUrl }: { audioUrl: string }) => {
  const [semitones, setSemitones] = useState(-6);
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(ab => {
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        return ctx.decodeAudioData(ab);
      })
      .then(buf => { bufferRef.current = buf; });
    return () => { sourceRef.current?.stop(); ctxRef.current?.close(); };
  }, [audioUrl]);

  const play = useCallback(() => {
    if (!bufferRef.current || !ctxRef.current) return;
    sourceRef.current?.stop();
    const src = ctxRef.current.createBufferSource();
    src.buffer = bufferRef.current;
    src.detune.value = semitones * 100; // semitones to cents
    src.connect(ctxRef.current.destination);
    src.start(0, offsetRef.current);
    startTimeRef.current = ctxRef.current.currentTime - offsetRef.current;
    sourceRef.current = src;
    setIsPlaying(true);
    src.onended = () => { offsetRef.current = 0; setIsPlaying(false); };
  }, [semitones]);

  const pause = useCallback(() => {
    if (!ctxRef.current) return;
    offsetRef.current = ctxRef.current.currentTime - startTimeRef.current;
    sourceRef.current?.stop();
    setIsPlaying(false);
  }, []);

  // re-play with new pitch if already playing
  const changeSemitones = (val: number) => {
    setSemitones(val);
    if (isPlaying && bufferRef.current && ctxRef.current) {
      offsetRef.current = ctxRef.current.currentTime - startTimeRef.current;
      sourceRef.current?.stop();
      const src = ctxRef.current.createBufferSource();
      src.buffer = bufferRef.current;
      src.detune.value = val * 100;
      src.connect(ctxRef.current.destination);
      src.start(0, offsetRef.current);
      startTimeRef.current = ctxRef.current.currentTime - offsetRef.current;
      sourceRef.current = src;
      src.onended = () => { offsetRef.current = 0; setIsPlaying(false); };
    }
  };

  const voices = [
    { label: '👹 Deep', value: -6 },
    { label: '🐭 Chipmunk', value: 6 },
    { label: '🤖 Robot', value: -12 },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold dark:text-white/40 text-gray-400 uppercase tracking-wider mb-3">Play Audio</h3>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={isPlaying ? pause : play}
          className="w-10 h-10 flex-shrink-0 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 transition-all"
        >
          {isPlaying
            ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          }
        </button>
        <div className="flex-1">
          <p className="text-xs dark:text-white/50 text-gray-500">Voice disguise active</p>
          <p className="text-xs dark:text-white/25 text-gray-400">Original voice is masked</p>
        </div>
      </div>
      <p className="text-xs dark:text-white/30 text-gray-400 mb-2">Voice Style</p>
      <div className="flex gap-2 flex-wrap">
        {voices.map(v => (
          <button
            key={v.value}
            onClick={() => changeSemitones(v.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              semitones === v.value
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                : 'dark:bg-white/5 bg-gray-100 dark:text-white/50 text-gray-500 dark:hover:bg-white/10 hover:bg-gray-200'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const AudioPlayer = ({ audioUrl }: { audioUrl: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);

  const changeSpeed = (val: number) => {
    setSpeed(val);
    if (audioRef.current) audioRef.current.playbackRate = val;
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold dark:text-white/40 text-gray-400 uppercase tracking-wider mb-3">Play Audio</h3>
      <audio ref={audioRef} controls src={audioUrl} className="w-full mb-3" />
      <p className="text-xs dark:text-white/30 text-gray-400 mb-2">Playback Speed</p>
      <div className="flex gap-1.5 flex-wrap">
        {speeds.map(v => (
          <button
            key={v}
            onClick={() => changeSpeed(v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              speed === v
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                : 'dark:bg-white/5 bg-gray-100 dark:text-white/50 text-gray-500 dark:hover:bg-white/10 hover:bg-gray-200'
            }`}
          >
            {v === 1 ? '1x' : `${v}x`}
          </button>
        ))}
      </div>
    </div>
  );
};

const DetailModal = ({ title, link, tags = [], summary = "", icon, audioUrl, isShared, onClose }: DetailModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="dark:bg-[#1a1a2e] bg-white dark:border-white/10 border-gray-200 border rounded-2xl shadow-2xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold dark:text-white text-gray-900 truncate">{title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="text-xs dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/20 bg-violet-100 text-violet-700 border-violet-200 border px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 dark:text-white/40 text-gray-400 dark:hover:text-white hover:text-gray-700 dark:hover:bg-white/10 hover:bg-gray-100 rounded-xl transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px dark:bg-white/5 bg-gray-100 mb-5" />

        {/* Summary */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold dark:text-white/40 text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
          <p className="dark:text-white/70 text-gray-600 text-sm leading-relaxed">
            {summary || 'No summary available.'}
          </p>
        </div>

        {/* Audio Player */}
        {icon === 'Voice' && audioUrl && (
          isShared ? <PitchedAudioPlayer audioUrl={audioUrl} /> : <AudioPlayer audioUrl={audioUrl} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          {icon !== 'Text' && icon !== 'Voice' && link && (
            <a
              href={link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Link
            </a>
          )}
          {icon === 'Voice' && link && (
            <a
              href={link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200"
            >
              Open Link
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 dark:bg-white/5 bg-gray-100 dark:hover:bg-white/10 hover:bg-gray-200 dark:text-white/70 text-gray-600 dark:hover:text-white hover:text-gray-900 text-sm font-medium rounded-xl dark:border-white/10 border-gray-200 border transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
