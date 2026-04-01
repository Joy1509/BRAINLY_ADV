import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useNotification } from '../NotificationUi/NotificationProvider';
import { useTheme } from '../../context/ThemeContext';

interface ShareModalProps {
  shareUrl: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ shareUrl, onClose }) => {
  const { showNotification } = useNotification();
  const { isDark } = useTheme();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { generateQRCode(); }, [shareUrl, isDark]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const qrUrl = await QRCode.toDataURL(shareUrl, {
        width: 220, margin: 2,
        color: {
          dark: isDark ? '#a78bfa' : '#7c3aed',
          light: isDark ? '#13131f' : '#ffffff'
        }
      });
      setQrCodeUrl(qrUrl);
    } catch {
      showNotification('error', 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showNotification('success', 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotification('error', 'Failed to copy link');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="dark:bg-[#1a1a2e] bg-white dark:border-white/10 border-gray-200 border rounded-2xl shadow-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold dark:text-white text-gray-900">Share Your Brain</h2>
            <p className="text-xs dark:text-white/40 text-gray-400 mt-0.5">Share your knowledge with others</p>
          </div>
          <button onClick={onClose} className="p-2 dark:text-white/40 text-gray-400 dark:hover:text-white hover:text-gray-700 dark:hover:bg-white/10 hover:bg-gray-100 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          {loading ? (
            <div className="w-56 h-56 dark:bg-white/5 bg-gray-100 rounded-2xl dark:border-white/10 border-gray-200 border flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <div className={`p-3 rounded-2xl dark:bg-[#13131f] bg-gray-50 dark:border-white/10 border-gray-200 border`}>
              <img src={qrCodeUrl} alt="QR Code" className="w-52 h-52 rounded-xl" />
            </div>
          )}
        </div>

        <p className="text-center text-xs dark:text-white/30 text-gray-400 mb-4">Scan to open shared page</p>

        {/* URL */}
        <div className="dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 border rounded-xl p-3 mb-4">
          <p className="text-xs dark:text-white/50 text-gray-500 break-all font-mono leading-relaxed">{shareUrl}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${copied ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25'}`}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <a
            href={shareUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium dark:bg-white/5 bg-gray-100 dark:hover:bg-white/10 hover:bg-gray-200 dark:text-white/70 text-gray-600 dark:hover:text-white hover:text-gray-900 dark:border-white/10 border-gray-200 border transition-all duration-200"
          >
            Open Page
          </a>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
