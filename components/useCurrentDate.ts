"use client";

import { useEffect, useState } from "react";

export function useCurrentDate() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: number;

    const scheduleNextUpdate = () => {
      const nextMidnight = new Date();
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 1, 0);

      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextUpdate();
      }, nextMidnight.getTime() - Date.now());
    };

    scheduleNextUpdate();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return now;
}
