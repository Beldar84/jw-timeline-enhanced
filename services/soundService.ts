
// Sonidos mejorados con efectos más temáticos y de mejor calidad
// Usando freesound.org y otros recursos libres de alta calidad
const clickSound = new Audio('https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3'); // Click suave
const correctSound = new Audio('https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3'); // Campana éxito
const incorrectSound = new Audio('https://cdn.freesound.org/previews/142/142608_2615119-lq.mp3'); // Error suave
const winSound = new Audio('https://cdn.freesound.org/previews/270/270319_5123851-lq.mp3'); // Victoria épica
const cardFlipSound = new Audio('https://cdn.freesound.org/previews/67/67454_7037-lq.mp3'); // Sonido de carta
const dealCardSound = new Audio('https://cdn.freesound.org/previews/419/419069_1794178-lq.mp3'); // Repartir carta

// Música de fondo - múltiples pistas para variedad
const backgroundMusicTracks = [
  'https://cdn.freesound.org/previews/462/462091_9497060-lq.mp3', // Ambient peaceful
  'https://cdn.freesound.org/previews/514/514079_4489943-lq.mp3', // Soft piano
  'https://cdn.freesound.org/previews/468/468407_9497060-lq.mp3', // Calm atmosphere
];

let backgroundMusic: HTMLAudioElement | null = null;
let currentTrackIndex = 0;

// Storage keys
const STORAGE_KEY_VOLUME = 'jw_timeline_volume';
const STORAGE_KEY_MUSIC_VOLUME = 'jw_timeline_music_volume';
const STORAGE_KEY_MUTED = 'jw_timeline_muted';
const STORAGE_KEY_MUSIC_ENABLED = 'jw_timeline_music_enabled';

// Default values
let soundVolume = 0.4;
let musicVolume = 0.2;
let isMuted = false;
let isMusicEnabled = false;

// Load settings from localStorage
const loadSettings = () => {
  try {
    const storedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
    const storedMusicVolume = localStorage.getItem(STORAGE_KEY_MUSIC_VOLUME);
    const storedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
    const storedMusicEnabled = localStorage.getItem(STORAGE_KEY_MUSIC_ENABLED);

    if (storedVolume !== null) soundVolume = parseFloat(storedVolume);
    if (storedMusicVolume !== null) musicVolume = parseFloat(storedMusicVolume);
    if (storedMuted !== null) isMuted = storedMuted === 'true';
    if (storedMusicEnabled !== null) isMusicEnabled = storedMusicEnabled === 'true';
  } catch (e) {
    console.warn('Could not load sound settings:', e);
  }
};

// Save settings to localStorage
const saveSettings = () => {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, soundVolume.toString());
    localStorage.setItem(STORAGE_KEY_MUSIC_VOLUME, musicVolume.toString());
    localStorage.setItem(STORAGE_KEY_MUTED, isMuted.toString());
    localStorage.setItem(STORAGE_KEY_MUSIC_ENABLED, isMusicEnabled.toString());
  } catch (e) {
    console.warn('Could not save sound settings:', e);
  }
};

// Initialize settings
loadSettings();

// Sound effects array for volume control
const soundEffects = [clickSound, correctSound, incorrectSound, winSound, cardFlipSound, dealCardSound];

// Apply current volume to all sounds
const applyVolume = () => {
  const effectiveVolume = isMuted ? 0 : soundVolume;
  soundEffects.forEach(audio => {
    audio.volume = effectiveVolume;
  });

  if (backgroundMusic) {
    backgroundMusic.volume = isMuted ? 0 : musicVolume;
  }
};

// Preload sounds
soundEffects.forEach(audio => {
  audio.load();
});
applyVolume();

const playSound = async (audio: HTMLAudioElement) => {
  if (isMuted) return;

  try {
    // Resetting current time allows the sound to be played again quickly
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    // Silently fail if audio context is not allowed or format not supported
    console.warn("Audio playback failed:", error);
  }
};

// Background music functions
const initBackgroundMusic = () => {
  if (backgroundMusic) return;

  backgroundMusic = new Audio(backgroundMusicTracks[currentTrackIndex]);
  backgroundMusic.loop = false;
  backgroundMusic.volume = isMuted ? 0 : musicVolume;

  // When track ends, play next
  backgroundMusic.addEventListener('ended', () => {
    currentTrackIndex = (currentTrackIndex + 1) % backgroundMusicTracks.length;
    if (backgroundMusic) {
      backgroundMusic.src = backgroundMusicTracks[currentTrackIndex];
      if (isMusicEnabled && !isMuted) {
        backgroundMusic.play().catch(console.warn);
      }
    }
  });
};

const startBackgroundMusic = async () => {
  initBackgroundMusic();
  if (!backgroundMusic) return;

  isMusicEnabled = true;
  saveSettings();

  try {
    backgroundMusic.volume = isMuted ? 0 : musicVolume;
    await backgroundMusic.play();
  } catch (error) {
    console.warn("Background music playback failed:", error);
  }
};

const stopBackgroundMusic = () => {
  isMusicEnabled = false;
  saveSettings();

  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
};

const pauseBackgroundMusic = () => {
  if (backgroundMusic) {
    backgroundMusic.pause();
  }
};

const resumeBackgroundMusic = async () => {
  if (backgroundMusic && isMusicEnabled && !isMuted) {
    try {
      await backgroundMusic.play();
    } catch (error) {
      console.warn("Background music resume failed:", error);
    }
  }
};

export const soundService = {
  playClick: () => playSound(clickSound),
  playCorrect: () => playSound(correctSound),
  playIncorrect: () => playSound(incorrectSound),
  playWin: () => playSound(winSound),
  playCardFlip: () => playSound(cardFlipSound),
  playDealCard: () => playSound(dealCardSound),

  // Sound effects volume control
  setVolume: (volume: number) => {
    soundVolume = Math.max(0, Math.min(1, volume));
    applyVolume();
    saveSettings();
  },

  getVolume: () => soundVolume,

  // Music volume control
  setMusicVolume: (volume: number) => {
    musicVolume = Math.max(0, Math.min(1, volume));
    if (backgroundMusic) {
      backgroundMusic.volume = isMuted ? 0 : musicVolume;
    }
    saveSettings();
  },

  getMusicVolume: () => musicVolume,

  // Mute/unmute all audio
  toggleMute: () => {
    isMuted = !isMuted;
    applyVolume();
    saveSettings();
    return isMuted;
  },

  setMuted: (muted: boolean) => {
    isMuted = muted;
    applyVolume();
    saveSettings();
  },

  isMuted: () => isMuted,

  // Background music controls
  startMusic: startBackgroundMusic,
  stopMusic: stopBackgroundMusic,
  pauseMusic: pauseBackgroundMusic,
  resumeMusic: resumeBackgroundMusic,
  toggleMusic: () => {
    if (isMusicEnabled) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
    return isMusicEnabled;
  },
  isMusicEnabled: () => isMusicEnabled,

  // Quick mute toggle (mutes all)
  mute: () => {
    isMuted = true;
    applyVolume();
    saveSettings();
  },

  unmute: () => {
    isMuted = false;
    applyVolume();
    saveSettings();
    if (isMusicEnabled && backgroundMusic) {
      backgroundMusic.play().catch(console.warn);
    }
  },

  // Get all settings for UI
  getSettings: () => ({
    soundVolume,
    musicVolume,
    isMuted,
    isMusicEnabled,
  }),
};
