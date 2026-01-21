import React, { useEffect, useRef, useState } from 'react';
import { Card as CardType } from '../types';
import Card from './Card';

export interface AnimationInfo {
  key: number;
  card: CardType;
  fromRect: DOMRect;
  toRect: DOMRect;
  onComplete: () => void;
  type?: 'placement' | 'draw' | 'discard'; // Animation type for different effects
}

interface AnimationLayerProps {
  animation: AnimationInfo | null;
}

const AnimationLayerEnhanced: React.FC<AnimationLayerProps> = ({ animation }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [styles, setStyles] = useState<React.CSSProperties>({});
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (animation) {
      const { fromRect, toRect, onComplete, type = 'placement' } = animation;

      // Determine animation duration and easing based on type
      const duration = type === 'draw' ? 400 : 600;
      const easing = type === 'draw' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.4, 0.0, 0.2, 1)';

      // Initial position with scale effect
      setStyles({
        position: 'fixed',
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
        zIndex: 100,
        transform: 'scale(1) rotate(0deg)',
        opacity: 1,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        transition: `all ${duration}ms ${easing}`,
      });

      // Create particle effect for placement animations
      if (type === 'placement') {
        const particleArray = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          x: toRect.left + toRect.width / 2,
          y: toRect.top + toRect.height / 2,
        }));
        setTimeout(() => setParticles(particleArray), duration - 100);
        setTimeout(() => setParticles([]), duration + 500);
      }

      // Use requestAnimationFrame for smooth animation start
      const frameId = requestAnimationFrame(() => {
        // Calculate midpoint for arc effect on placement
        const midX = (fromRect.left + toRect.left) / 2;
        const midY = Math.min(fromRect.top, toRect.top) - 100; // Arc height

        if (type === 'placement') {
          // First move to midpoint with rotation and scale
          setTimeout(() => {
            setStyles({
              position: 'fixed',
              left: `${midX - fromRect.width / 2}px`,
              top: `${midY}px`,
              width: `${fromRect.width * 1.1}px`,
              height: `${fromRect.height * 1.1}px`,
              zIndex: 100,
              transform: 'scale(1.1) rotate(5deg)',
              opacity: 1,
              boxShadow: '0 20px 60px rgba(255, 215, 0, 0.4)',
              transition: `all ${duration / 2}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
            });
          }, 10);

          // Then move to final position
          setTimeout(() => {
            setStyles({
              position: 'fixed',
              left: `${toRect.left}px`,
              top: `${toRect.top}px`,
              width: `${toRect.width}px`,
              height: `${toRect.height}px`,
              zIndex: 100,
              transform: 'scale(1) rotate(0deg)',
              opacity: 1,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
              transition: `all ${duration / 2}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
            });
          }, duration / 2);
        } else {
          // Direct animation for draw/discard
          setStyles({
            position: 'fixed',
            left: `${toRect.left}px`,
            top: `${toRect.top}px`,
            width: `${toRect.width}px`,
            height: `${toRect.height}px`,
            zIndex: 100,
            transform: type === 'draw' ? 'scale(1.05) rotate(2deg)' : 'scale(0.95) rotate(-2deg)',
            opacity: type === 'discard' ? 0.7 : 1,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            transition: `all ${duration}ms ${easing}`,
          });
        }
      });

      const timeoutId = setTimeout(onComplete, duration);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timeoutId);
        setParticles([]);
      };
    }
  }, [animation]);

  if (!animation) {
    return null;
  }

  return (
    <>
      {/* Animated Card */}
      <div ref={cardRef} style={styles}>
        <Card card={animation.card} showYear={false} className="w-full h-full" />
      </div>

      {/* Particle Effects */}
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 99 }}>
          {particles.map((particle, index) => {
            const angle = (index / particles.length) * Math.PI * 2;
            const distance = 80;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            return (
              <div
                key={particle.id}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                  transform: `translate(${tx}px, ${ty}px)`,
                  opacity: 0,
                  animation: 'sparkle 0.6s ease-out forwards',
                  animationDelay: `${index * 0.05}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Sparkle animation styles injected via style tag */}
      <style>{`
        @keyframes sparkle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx, 0), var(--ty, 0)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default AnimationLayerEnhanced;
