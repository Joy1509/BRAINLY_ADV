import { useEffect, useState } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Notification = ({ type, message, isVisible, onClose, duration = 3000 }: NotificationProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        try {
          setIsAnimating(false);
          setTimeout(onClose, 300);
        } catch (error) {
          console.error('Error in notification timer:', error);
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isAnimating) return null;

  const typeStyles = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600',
    warning: 'bg-yellow-500 border-yellow-600'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`${typeStyles[type]} text-white px-6 py-4 rounded-lg shadow-lg border-l-4 min-w-80 max-w-96`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold">{icons[type]}</span>
            <span className="font-medium">{message}</span>
          </div>
          <button 
            onClick={() => {
              try {
                setIsAnimating(false);
                setTimeout(onClose, 300);
              } catch (error) {
                console.error('Error in notification close:', error);
              }
            }}
            className="text-white hover:text-gray-200 text-xl font-bold ml-4"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;