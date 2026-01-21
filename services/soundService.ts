
// Sonidos mejorados con efectos más temáticos y de mejor calidad
// Usando freesound.org y otros recursos libres de alta calidad
const clickSound = new Audio('https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3'); // Click suave
const correctSound = new Audio('https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3'); // Campana éxito
const incorrectSound = new Audio('https://cdn.freesound.org/previews/142/142608_2615119-lq.mp3'); // Error suave
const winSound = new Audio('https://cdn.freesound.org/previews/270/270319_5123851-lq.mp3'); // Victoria épica
const cardFlipSound = new Audio('https://cdn.freesound.org/previews/67/67454_7037-lq.mp3'); // Sonido de carta
const dealCardSound = new Audio('https://cdn.freesound.org/previews/419/419069_1794178-lq.mp3'); // Repartir carta

// Preload sounds
[clickSound, correctSound, incorrectSound, winSound, cardFlipSound, dealCardSound].forEach(audio => {
    audio.load();
    audio.volume = 0.4; // Volumen reducido al 40% para no ser intrusivo
});

const playSound = async (audio: HTMLAudioElement) => {
  try {
    // Resetting current time allows the sound to be played again quickly
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    // Silently fail if audio context is not allowed or format not supported
    console.warn("Audio playback failed:", error);
  }
};

export const soundService = {
  playClick: () => playSound(clickSound),
  playCorrect: () => playSound(correctSound),
  playIncorrect: () => playSound(incorrectSound),
  playWin: () => playSound(winSound),
  playCardFlip: () => playSound(cardFlipSound),
  playDealCard: () => playSound(dealCardSound),

  // Control de volumen
  setVolume: (volume: number) => {
    const vol = Math.max(0, Math.min(1, volume)); // Clamp entre 0 y 1
    [clickSound, correctSound, incorrectSound, winSound, cardFlipSound, dealCardSound].forEach(audio => {
      audio.volume = vol;
    });
  },

  // Silenciar/activar todos los sonidos
  mute: () => {
    [clickSound, correctSound, incorrectSound, winSound, cardFlipSound, dealCardSound].forEach(audio => {
      audio.volume = 0;
    });
  },

  unmute: () => {
    [clickSound, correctSound, incorrectSound, winSound, cardFlipSound, dealCardSound].forEach(audio => {
      audio.volume = 0.4;
    });
  },
};
