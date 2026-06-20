"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingProvider } from "@/context/LoadingContext";
import Loader from "./Loader";
import DoorBackground from "./DoorBackground";
import BrightnessWash from "./BrightnessWash";
import UIOverlay from "./UIOverlay";
import ScrollOpenModal from "./ScrollOpenModal";
import DoorChimeAudio from "./DoorChimeAudio";
import CursorGlitterTrail from "./CursorGlitterTrail";
import DoorSceneCanvas from "./DoorSceneCanvas";
import ShopExperience from "./jewelry/ShopExperience";
import {
  preloadBoutiqueAudio,
  startBoutiqueAudioFromGesture,
  stopBoutiqueAudio,
} from "@/lib/boutiqueAudio";
import { useScrollDoorProgress } from "@/hooks/useScrollDoorProgress";

function ExperienceInner() {
  const [ready, setReady] = useState(false);
  const [scrollModalOpen, setScrollModalOpen] = useState(false);
  const {
    scrollRef,
    progressRef,
    doorProgress,
    entered,
    brightness,
    canvasOpacity,
    scrollHeight,
    getOpenDistance,
  } = useScrollDoorProgress(ready);

  const handleLoadComplete = useCallback(() => {
    setReady(true);
  }, []);

  const doorOpacity = Math.min(1, Math.max(0, canvasOpacity));
  const onDoorScreen = ready && !entered;

  const closeScrollModal = useCallback(() => {
    setScrollModalOpen(false);
  }, []);

  useEffect(() => {
    if (onDoorScreen) setScrollModalOpen(true);
    else setScrollModalOpen(false);
  }, [onDoorScreen]);

  useEffect(() => {
    if (!scrollModalOpen || !onDoorScreen) return;
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (el.scrollTop > 1) closeScrollModal();
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) closeScrollModal();
    };
    const onTouchMove = () => closeScrollModal();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [scrollModalOpen, onDoorScreen, scrollRef, closeScrollModal]);

  useEffect(() => {
    if (!ready) return;
    preloadBoutiqueAudio();
  }, [ready]);

  useEffect(() => {
    if (entered) stopBoutiqueAudio();
  }, [entered]);

  useEffect(() => {
    if (!onDoorScreen) return;
    const el = scrollRef.current;
    if (!el) return;

    const applyScroll = (deltaY: number) => {
      const openDist = getOpenDistance();
      const maxScroll = openDist + 48;
      el.scrollTop = Math.min(maxScroll, Math.max(0, el.scrollTop + deltaY));
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      applyScroll(e.deltaY);
      const openDist = getOpenDistance();
      const p = Math.min(1, Math.max(0, el.scrollTop / openDist));
      startBoutiqueAudioFromGesture(p);
    };

    const onTouchMove = () => {
      const openDist = getOpenDistance();
      const p = Math.min(1, Math.max(0, el.scrollTop / openDist));
      startBoutiqueAudioFromGesture(p);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [onDoorScreen, scrollRef, getOpenDistance]);

  return (
    <div className="relative h-full w-full bg-maj-cream">
      <CursorGlitterTrail />
      <Loader onComplete={handleLoadComplete} />

      {ready && (
        <DoorChimeAudio
          active={ready}
          doorProgress={doorProgress}
          doorScreenActive={onDoorScreen}
        />
      )}

      {onDoorScreen && <DoorBackground fadeProgress={doorProgress} />}

      {ready && entered && <ShopExperience visible={entered} />}

      {onDoorScreen && (
        <DoorSceneCanvas
          progressRef={progressRef}
          brightness={brightness}
          opacity={doorOpacity}
        />
      )}

      {onDoorScreen && <BrightnessWash intensity={brightness} />}
      {onDoorScreen && (
        <ScrollOpenModal open={scrollModalOpen} onClose={closeScrollModal} />
      )}
      {onDoorScreen && (
        <UIOverlay
          doorProgress={doorProgress}
          showHint={!scrollModalOpen && doorProgress < 0.88}
        />
      )}

      {onDoorScreen && (
        <div
          ref={scrollRef}
          className="door-scroll-layer fixed inset-0 z-[30] overflow-x-hidden overflow-y-auto overscroll-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div style={{ height: scrollHeight, minHeight: scrollHeight }} aria-hidden />
        </div>
      )}
    </div>
  );
}

export default function Experience() {
  return (
    <LoadingProvider>
      <ExperienceInner />
    </LoadingProvider>
  );
}
