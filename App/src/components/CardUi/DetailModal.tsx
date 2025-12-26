import React from "react";

interface DetailModalProps {
  title: string;
  link: string;
  tags?: string[];
  summary?: string;
  onClose: () => void;
}

const DetailModal = ({ title, link, tags = [], summary = "", onClose }: DetailModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="text-xs bg-gray-100 px-2 py-1 rounded">#{t}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">Close</button>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700">Summary</h3>
          <p className="mt-2 text-gray-700">{summary || 'No summary available.'}</p>
        </div>

        <div className="mt-6 flex items-center gap-3 justify-end">
          <a href={link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Open Link</a>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;