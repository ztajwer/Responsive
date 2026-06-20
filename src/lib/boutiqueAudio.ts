const CHIME_SRC = "/door-chime.mp3";
const DOOR_BASE_VOLUME = 0.22;
const DOOR_MAX_VOLUME = 0.36;
const PLAY_THRESHOLD = 0.04;
const STOP_THRESHOLD = 0.025;

let audio: HTMLAudioElement | null = null;
let hasStarted = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(CHIME_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
  }
  return audio;
}

export function preloadBoutiqueAudio() {
  getAudio()?.load();
}

function doorVolume(progress: number) {
  const t = Math.min(1, Math.max(0, (progress - PLAY_THRESHOLD) / (1 - PLAY_THRESHOLD)));
  return DOOR_BASE_VOLUME + t * (DOOR_MAX_VOLUME - DOOR_BASE_VOLUME);
}

/** Call synchronously inside wheel / touch handlers while on the door screen. */
export function startBoutiqueAudioFromGesture(doorProgress: number) {
  const el = getAudio();
  if (!el || doorProgress < PLAY_THRESHOLD) return;

  el.volume = doorVolume(doorProgress);

  if (hasStarted && !el.paused) return;

  try {
    const result = el.play();
    hasStarted = true;
    if (result && typeof result.catch === "function") {
      result.catch(() => {
        hasStarted = false;
      });
    }
  } catch {
    hasStarted = false;
  }
}

/** Keep volume in sync while doors are open; pause when closed or door screen ends. */
export function syncDoorChimeAudio(doorProgress: number, doorScreenActive: boolean) {
  const el = getAudio();
  if (!el) return;

  if (!doorScreenActive || doorProgress >= 0.96 || doorProgress < STOP_THRESHOLD) {
    stopBoutiqueAudio();
    return;
  }

  if (!hasStarted || el.paused) return;
  el.volume = doorVolume(doorProgress);
}

export function stopBoutiqueAudio() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  hasStarted = false;
}

export function isDoorChimePlaying() {
  return hasStarted && !!audio && !audio.paused;
}
