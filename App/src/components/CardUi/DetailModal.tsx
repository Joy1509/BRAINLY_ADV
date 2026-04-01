import React from "react";

interface DetailModalProps {
  title: string;
  link: string;
  tags?: string[];
  summary?: string;
  icon?: string;
  onClose: () => void;
}

const DetailModal = ({ title, link, tags = [], summary = "", icon, onClose }: DetailModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="dark:bg-[#1a1a2e] bg-white dark:border-white/10 border-gray-200 border rounded-2xl shadow-2xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold dark:text-white text-gray-900 truncate">{title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="text-xs dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/20 bg-violet-100 text-violet-700 border-violet-200 border px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 dark:text-white/40 text-gray-400 dark:hover:text-white hover:text-gray-700 dark:hover:bg-white/10 hover:bg-gray-100 rounded-xl transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px dark:bg-white/5 bg-gray-100 mb-5" />

        {/* Summary */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold dark:text-white/40 text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
          <p className="dark:text-white/70 text-gray-600 text-sm leading-relaxed">
            {summary || 'No summary available.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          {icon !== 'Text' && link && (
            <a
              href={link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Link
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 dark:bg-white/5 bg-gray-100 dark:hover:bg-white/10 hover:bg-gray-200 dark:text-white/70 text-gray-600 dark:hover:text-white hover:text-gray-900 text-sm font-medium rounded-xl dark:border-white/10 border-gray-200 border transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
