'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePageIntro } from './page-intro';

export default function Decorative() {
  const cursor = useRef<HTMLDivElement>(null);
  const { active: opening } = usePageIntro();

  useEffect(() => {
    if (opening) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const hero = document.querySelector<HTMLElement>('.hero');
      const study = document.querySelector<HTMLElement>('.study-tilt');
      const motion = gsap.context(() => {
        gsap.from('.hero-title', { y: 14, duration: 0.85, ease: 'power3.out' });
        if (hero) {
          const scroll = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 };
          gsap.to('.study-scene', {
            rotationX: 18,
            rotationY: 14,
            rotationZ: 6,
            y: -16,
            ease: 'none',
            scrollTrigger: { ...scroll },
          });
          gsap.to('.study-plane', {
            z: (index) => index * 32,
            y: (index) => index * -8,
            ease: 'none',
            scrollTrigger: { ...scroll },
          });
        }
        gsap.from('.footer-statement', {
          y: 16,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.site-footer', start: 'top 95%', once: true },
        });
      });

      const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
      const tiltX = study
        ? gsap.quickTo(study, 'rotationX', { duration: 0.7, ease: 'power3.out' })
        : null;
      const tiltY = study
        ? gsap.quickTo(study, 'rotationY', { duration: 0.7, ease: 'power3.out' })
        : null;
      const magnetic = new Map<
        HTMLElement,
        { x: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo> }
      >();
      let activeButton: HTMLElement | null = null;
      const resetButton = () => {
        if (!activeButton) return;
        magnetic.get(activeButton)?.x(0);
        magnetic.get(activeButton)?.y(0);
        activeButton = null;
      };
      const leave = () => {
        if (cursor.current) cursor.current.style.opacity = '0';
        resetButton();
        tiltX?.(0);
        tiltY?.(0);
      };
      const move = (event: PointerEvent) => {
        if (!fine.matches || event.pointerType === 'touch') {
          leave();
          return;
        }
        const target = event.target instanceof Element ? event.target : null;
        const dot = cursor.current;
        const interactive = target?.closest<HTMLElement>(
          'button:not(:disabled), a, summary, select, [role="tab"], [data-cursor]',
        );
        if (dot) {
          dot.style.opacity = target?.closest('.editor-body, .step-chart') ? '0' : '1';
          dot.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
          dot.dataset.active = interactive ? 'true' : 'false';
          dot.textContent = interactive?.dataset.cursor ?? '';
        }
        const button = target?.closest<HTMLElement>('[data-magnetic]:not(:disabled)') ?? null;
        if (button !== activeButton) resetButton();
        if (button) {
          activeButton = button;
          if (!magnetic.has(button)) {
            magnetic.set(button, {
              x: gsap.quickTo(button, 'x', { duration: 0.35, ease: 'power3.out' }),
              y: gsap.quickTo(button, 'y', { duration: 0.35, ease: 'power3.out' }),
            });
          }
          const rect = button.getBoundingClientRect();
          magnetic
            .get(button)
            ?.x(Math.max(-3, Math.min(3, (event.clientX - rect.left - rect.width / 2) * 0.05)));
          magnetic
            .get(button)
            ?.y(Math.max(-2, Math.min(2, (event.clientY - rect.top - rect.height / 2) * 0.05)));
        }
        if (hero && target && hero.contains(target)) {
          const rect = hero.getBoundingClientRect();
          tiltX?.(-((event.clientY - rect.top) / rect.height - 0.5) * 8);
          tiltY?.(((event.clientX - rect.left) / rect.width - 0.5) * 10);
        } else {
          tiltX?.(0);
          tiltY?.(0);
        }
      };
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('blur', leave);
      document.addEventListener('pointerleave', leave);
      fine.addEventListener('change', leave);
      return () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('blur', leave);
        document.removeEventListener('pointerleave', leave);
        fine.removeEventListener('change', leave);
        tiltX?.tween.kill();
        tiltY?.tween.kill();
        for (const [button, tween] of magnetic) {
          tween.x.tween.kill();
          tween.y.tween.kill();
          gsap.set(button, { clearProps: 'transform' });
        }
        if (study) gsap.set(study, { clearProps: 'transform' });
        motion.revert();
      };
    });
    return () => media.revert();
  }, [opening]);

  return <div ref={cursor} className="custom-cursor" aria-hidden="true" />;
}
