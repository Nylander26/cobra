"use client";

import { useEffect, useRef } from "react";

// Cinta serpenteante de puntos (three.js): ondula como una cobra y como una
// curva de tesorería; el cuerpo es verde y la cabeza vira a ámbar. Decorativa:
// aria-hidden, sin interacción, pausada con la pestaña oculta y estática si
// el usuario prefiere movimiento reducido. three se importa al montar para
// no engordar el bundle inicial.
export function HeroWave() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;

    let raf = 0;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed || !host.isConnected) return;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      // La niebla funde los extremos de la cinta con el fondo tinta del hero.
      scene.fog = new THREE.Fog(new THREE.Color("#12241c"), 12, 30);

      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      // El objetivo alto empuja la cinta al cuarto inferior del hero, por
      // debajo del texto: nunca compite con la lectura.
      camera.position.set(0, 3.2, 12);
      camera.lookAt(0, 3.05, 0);

      const COLS = 220;
      const ROWS = 9;
      const LENGTH = 30;
      const WIDTH = 1.9;
      const count = COLS * ROWS;

      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const verde = new THREE.Color("#46a379");
      const ambar = new THREE.Color("#d9a84e");
      const c = new THREE.Color();

      for (let i = 0; i < COLS; i++) {
        const u = i / (COLS - 1);
        for (let j = 0; j < ROWS; j++) {
          const k = (i * ROWS + j) * 3;
          positions[k] = (u - 0.5) * LENGTH;
          positions[k + 1] = 0;
          positions[k + 2] = (j / (ROWS - 1) - 0.5) * WIDTH;
          c.copy(verde).lerp(ambar, u ** 3);
          colors[k] = c.r;
          colors[k + 1] = c.g;
          colors[k + 2] = c.b;
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.07,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        depthWrite: false,
      });
      scene.add(new THREE.Points(geo, mat));

      const pos = geo.getAttribute("position") as InstanceType<
        typeof THREE.BufferAttribute
      >;

      function wave(t: number) {
        for (let i = 0; i < COLS; i++) {
          const x0 = (i / (COLS - 1) - 0.5) * LENGTH;
          // Dos ondas viajeras (vertical) + un vaivén lateral: la "S".
          const y =
            Math.sin(x0 * 0.42 - t * 0.9) * 0.7 +
            Math.sin(x0 * 0.18 + t * 0.35) * 0.4;
          const sway = Math.sin(x0 * 0.22 - t * 0.5) * 0.9;
          for (let j = 0; j < ROWS; j++) {
            const idx = i * ROWS + j;
            const across = (j / (ROWS - 1) - 0.5) * WIDTH;
            pos.setY(idx, y + across * 0.12);
            pos.setZ(idx, sway + across);
          }
        }
        pos.needsUpdate = true;
      }

      function resize() {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      const ro = new ResizeObserver(() => {
        resize();
        renderer.render(scene, camera);
      });
      ro.observe(host);

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const start = performance.now();

      function frame(now: number) {
        wave((now - start) / 1000);
        renderer.render(scene, camera);
        if (!reduced) raf = requestAnimationFrame(frame);
      }

      function onVisibility() {
        cancelAnimationFrame(raf);
        if (!document.hidden && !reduced) raf = requestAnimationFrame(frame);
      }
      document.addEventListener("visibilitychange", onVisibility);

      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVisibility);
        ro.disconnect();
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      // En móvil el hero es alto y estrecho: la cinta vive solo en la mitad
      // inferior para no pisar el texto. En sm+ ocupa todo el hero.
      className="pointer-events-none absolute inset-x-0 top-1/2 bottom-0 sm:top-0"
    />
  );
}
