"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

import { CustomEase } from "gsap/CustomEase";
// CustomWiggle requires CustomEase
import { CustomWiggle } from "gsap/CustomWiggle";
import { SlowMo } from "gsap/EasePack";

import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// ScrollSmoother requires ScrollTrigger
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";

// Safely register plugins in client environment for SSR framework compatibility
if (typeof window !== "undefined") {
  gsap.registerPlugin(
    useGSAP,
    Draggable,
    Flip,
    MotionPathPlugin,
    Observer,
    ScrollTrigger,
    ScrollSmoother,
    ScrollToPlugin,
    SplitText,
    SlowMo,
    CustomEase,
    CustomWiggle
  );
}

export {
  gsap,
  useGSAP,
  Draggable,
  Flip,
  MotionPathPlugin,
  Observer,
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  SplitText,
  SlowMo,
  CustomEase,
  CustomWiggle,
};
