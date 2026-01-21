import React, { useEffect, useState } from 'react';
import { Achievement } from '../services/statsService';
import { soundService } from '../services/soundService';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({ achievement, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      // Play achievement sound
      soundService.playWin();

      // Show notification
      setTimeout(() => setIsVisible(true), 100);

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-[200] transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg shadow-2xl p-4 border-2 border-yellow-400 max-w-sm animate-bounce-slow">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="text-5xl animate-pulse">{achievement.icon}</div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎉</span>
              <h3 className="text-lg font-bold text-white">¡Logro Desbloqueado!</h3>
            </div>
            <h4 className="font-bold text-yellow-100 mb-1">{achievement.name}</h4>
            <p className="text-sm text-yellow-50">{achievement.description}</p>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-white hover:text-yellow-200 text-xl font-bold"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementNotification;
