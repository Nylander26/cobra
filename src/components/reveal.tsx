"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

// Revela su contenido al entrar en el viewport (fade + rise). El estado
// oculto inicial vive en CSS bajo prefers-reduced-motion: no-preference, así
// que con movimiento reducido se muestra de inmediato. Con motion, si por lo
// que sea no hay JS, un <noscript> en la página lo deja visible.
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={`${visible ? "is-visible" : ""} ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
