'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
export default function Decorative() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.from('.hero-title', { y: 18, duration: 0.7, ease: 'power3.out' });
      gsap.utils.toArray<HTMLElement>('.about-reveal').forEach((el) =>
        gsap.from(el, {
          y: 20,
          scrollTrigger: { trigger: el, scroller: '.about-scroll', start: 'top 95%' },
          duration: 0.5,
        }),
      );
    });
    const wrapper = document.querySelector<HTMLElement>('.about-scroll');
    const content = document.querySelector<HTMLElement>('.about-content');
    const lenis = wrapper && content ? new Lenis({ wrapper, content, autoRaf: true }) : null;
    const move = (e: PointerEvent) => {
      const dot = cursor.current;
      if (!dot) return;
      const target = e.target as HTMLElement;
      const interactive = target.closest<HTMLElement>('button,a,[data-cursor]');
      if (target.closest('.editor-body') || e.pointerType === 'touch') {
        dot.style.opacity = '0';
        return;
      }
      dot.style.opacity = '1';
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      dot.dataset.active = interactive ? 'true' : 'false';
      dot.textContent = interactive?.dataset.cursor ?? '';
    };
    const leave = () => {
      if (cursor.current) cursor.current.style.opacity = '0';
    };
    const magnetic = (e: PointerEvent) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-magnetic]');
      if (!button) return;
      const rect = button.getBoundingClientRect();
      gsap.to(button, {
        x: (e.clientX - rect.left - rect.width / 2) * 0.08,
        y: (e.clientY - rect.top - rect.height / 2) * 0.08,
        duration: 0.2,
      });
    };
    const reset = (e: PointerEvent) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-magnetic]');
      if (button) gsap.to(button, { x: 0, y: 0, duration: 0.2 });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointermove', magnetic);
    window.addEventListener('pointerout', reset);
    document.addEventListener('pointerleave', leave);
    return () => {
      context.revert();
      lenis?.destroy();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointermove', magnetic);
      window.removeEventListener('pointerout', reset);
      document.removeEventListener('pointerleave', leave);
      gsap.set('[data-magnetic]', { x: 0, y: 0 });
    };
  }, []);
  return <div ref={cursor} className="custom-cursor" aria-hidden="true" />;
}
