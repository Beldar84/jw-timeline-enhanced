
// Using MP3 files for better compatibility (Safari/iOS often fail with OGG)
const clickSound = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
const correctSound = new Audio('https://www.soundjay.com/misc/sounds/magic-chime-02.mp3');
const incorrectSound = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3'); 
const winSound = new Audio('https://www.soundjay.com/human/sounds/applause-01.mp3');

// Preload sounds
[clickSound, correctSound, incorrectSound, winSound].forEach(audio => {
    audio.load();
    audio.volume = 0.5; // Set volume to 50%
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
};
