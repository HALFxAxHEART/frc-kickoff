import { useEffect, useRef, useState } from "react";

/** Drives a 0..1 "scrub" position that ping-pongs back and forth when playing — shared by the
 * mechanism diagrams so a viewer can watch a simulated sweep/extension animate or drag through it. */
export function useScrubPlayback() {
  const [scrub, setScrub] = useState(1);
  const [playing, setPlaying] = useState(false);
  const directionRef = useRef(1);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setScrub((s) => {
        let next = s + directionRef.current * 0.02;
        if (next >= 1) {
          next = 1;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [playing]);

  function setScrubManually(value: number) {
    setPlaying(false);
    setScrub(value);
  }

  return { scrub, playing, setPlaying, setScrubManually };
}
