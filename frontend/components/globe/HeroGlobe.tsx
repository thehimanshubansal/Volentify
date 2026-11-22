'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface GlobeHotspot { lat: number; lng: number; critical?: boolean }

const RADIUS = 64;

function toVector(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/**
 * Ambient particle globe. Ivory/stone dot sphere, signal-orange hotspots for live incidents.
 * Pauses when offscreen; renders a single still frame under prefers-reduced-motion.
 */
export default function HeroGlobe({ hotspots = [] }: { hotspots?: GlobeHotspot[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hotspotKey = hotspots.map((h) => `${h.lat},${h.lng},${h.critical ? 1 : 0}`).join('|');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    camera.position.set(0, 0, 210);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return; // No WebGL — the headline stands on its own.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const globe = new THREE.Group();
    scene.add(globe);
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // Occluding core so back-facing dots fade out behind the sphere.
    const core = new THREE.Mesh(
      track(new THREE.SphereGeometry(RADIUS - 0.6, 64, 64)),
      track(new THREE.MeshBasicMaterial({ color: 0x07080a })),
    );
    globe.add(core);

    // Fibonacci dot lattice.
    const count = 3200;
    const positions = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      positions.set([Math.cos(t) * r * RADIUS, y * RADIUS, Math.sin(t) * r * RADIUS], i * 3);
    }
    const dotsGeo = track(new THREE.BufferGeometry());
    dotsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    globe.add(new THREE.Points(dotsGeo, track(new THREE.PointsMaterial({
      color: 0xc9c4b8, size: 0.9, transparent: true, opacity: 0.42, sizeAttenuation: true,
    }))));

    // Faint champagne rim.
    globe.add(new THREE.Mesh(
      track(new THREE.SphereGeometry(RADIUS * 1.045, 48, 48)),
      track(new THREE.MeshBasicMaterial({ color: 0xd4b483, side: THREE.BackSide, transparent: true, opacity: 0.05 })),
    ));

    // Hotspots.
    const rings: THREE.Mesh[] = [];
    const pinGeo = track(new THREE.SphereGeometry(1.25, 16, 16));
    const ringGeo = track(new THREE.RingGeometry(1.8, 2.4, 40));
    for (const h of hotspots) {
      const pos = toVector(h.lat, h.lng, RADIUS + 0.4);
      const pin = new THREE.Mesh(pinGeo, track(new THREE.MeshBasicMaterial({ color: h.critical ? 0xff6b00 : 0xff9a3c })));
      pin.position.copy(pos);
      globe.add(pin);
      const ring = new THREE.Mesh(ringGeo, track(new THREE.MeshBasicMaterial({
        color: 0xff6b00, side: THREE.DoubleSide, transparent: true, opacity: 0.6,
      })));
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2));
      ring.userData.phase = Math.random();
      globe.add(ring);
      rings.push(ring);
    }

    // Face India (≈ 22°N 80°E).
    globe.rotation.y = -((80 + 90) * Math.PI) / 180;
    globe.rotation.x = (22 * Math.PI) / 180 * 0.85;

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
    };
    resize();

    let frame = 0;
    let visible = true;
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.min(64, now - last);
      last = now;
      globe.rotation.y += dt * 0.00004;
      for (const ring of rings) {
        const p = ((now / 2400 + (ring.userData.phase as number)) % 1);
        ring.scale.setScalar(1 + p * 2.2);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - p);
      }
      renderer.render(scene, camera);
    };
    if (reduce) renderer.render(scene, camera);
    else frame = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => { resize(); if (reduce) renderer.render(scene, camera); });
    ro.observe(host);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = performance.now(); });
    io.observe(host);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspotKey]);

  return <div ref={hostRef} className="h-full w-full" />;
}
