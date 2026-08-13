"use client";

import { useEffect, useState } from "react";

const DURATION_SECONDS = 3 * 60 * 60; // 3 heures

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CountdownTimer() {
  const [seconds, setSeconds] = useState(DURATION_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s <= 1 ? DURATION_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (
    <div
      style={{
        display: "inline-block",
        background: "#fff3f3",
        border: "1.5px solid #e63946",
        color: "#e63946",
        borderRadius: 12,
        padding: "10px 20px",
        fontWeight: "bold",
        fontSize: "1.05em",
        margin: "16px 0",
      }}
    >
      ⏰ Offre limitée — se termine dans {pad(h)}:{pad(m)}:{pad(s)}
    </div>
  );
}
