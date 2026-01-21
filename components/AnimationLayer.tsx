import React, { useEffect, useRef, useState } from 'react';
import { Card as CardType } from '../types';
import Card from './Card';

export interface AnimationInfo {
  key: number;
  card: CardType;
  fromRect: DOMRect;
  toRect: DOMRect;
  onComplete: () => void;
}

interface AnimationLayerProps {
  animation: AnimationInfo | null;
}

const AnimationLayer: React.FC<AnimationLayerProps> = ({ animation }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [styles, setStyles] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (animation) {
      const { fromRect, toRect, onComplete } = animation;

      // Initial position before animation
      setStyles({
        position: 'fixed',
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
        zIndex: 100,
        transition: 'all 500ms ease-in-out',
      });

      // Use requestAnimationFrame to ensure the initial styles are applied before the animation starts
      const frameId = requestAnimationFrame(() => {
        // Target position for animation
        setStyles({
          position: 'fixed',
          left: `${toRect.left}px`,
          top: `${toRect.top}px`,
          width: `${toRect.width}px`,
          height: `${toRect.height}px`,
          zIndex: 100,
          transition: 'all 500ms ease-in-out',
        });
      });
      
      // Use a timeout to signal completion. This is more reliable than
      // 'transitionend' which can sometimes fail to fire.
      const timeoutId = setTimeout(onComplete, 500);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timeoutId);
      };
    }
  }, [animation]);

  if (!animation) {
    return null;
  }

  return (
    <div ref={cardRef} style={styles}>
      <Card card={animation.card} showYear={false} className="w-full h-full" />
    </div>
  );
};

export default AnimationLayer;