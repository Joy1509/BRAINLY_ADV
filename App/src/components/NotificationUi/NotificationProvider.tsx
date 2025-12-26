import { createContext, useContext, useState, ReactNode } from 'react';
import Notification from './Notification';
import ConfirmDialog from './ConfirmDialog';

interface NotificationContextType {
  showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  showConfirm: (title: string, message: string, type?: 'danger' | 'warning' | 'info') => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    isVisible: boolean;
  } | null>(null);

  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    isOpen: boolean;
    resolve?: (value: boolean) => void;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message, isVisible: true });
  };

  const showConfirm = (title: string, message: string, type: 'danger' | 'warning' | 'info' = 'info'): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({ title, message, type, isOpen: true, resolve });
    });
  };

  const handleConfirm = () => {
    if (confirm?.resolve) {
      confirm.resolve(true);
    }
    setConfirm(null);
  };

  const handleCancel = () => {
    if (confirm?.resolve) {
      confirm.resolve(false);
    }
    setConfirm(null);
  };

  const closeNotification = () => {
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirm }}>
      {children}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={closeNotification}
        />
      )}
      {confirm && (
        <ConfirmDialog
          isOpen={confirm.isOpen}
          title={confirm.title}
          message={confirm.message}
          type={confirm.type}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </NotificationContext.Provider>
  );
};