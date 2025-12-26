import { useRef, useState, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../NotificationUi/NotificationProvider";

interface ModalProps {
  onClick: () => void;
  setModal: (value: boolean) => void;
  setReloadData: () => void;
}

const Modal = memo(({ onClick, setModal, setReloadData }: ModalProps) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const titleRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const customTagRef = useRef<HTMLInputElement>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState("Youtube");
  const [showCustomTag, setShowCustomTag] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(() => ["Youtube", "Twitter", "Notion", "Instagram"] as const, []);
  const predefinedTags = useMemo(
    () => [
      "Productivity", "Tech & Tools", "Mindset", "Learning & Skills", 
      "Workflows", "Inspiration", "Business", "Health", "Finance"
    ],
    []
  );

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const addCustomTag = useCallback(() => {
    const customTag = customTagRef.current?.value.trim();
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags(prev => [...prev, customTag]);
      if (customTagRef.current) customTagRef.current.value = "";
      setShowCustomTag(false);
    }
  }, [selectedTags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const submitData = useCallback(async () => {
    // Prevent double clicks
    if (submitting) return;
    setSubmitting(true);

    const title = titleRef.current?.value.trim() || "";
    const link = linkRef.current?.value.trim() || "";

    if (!title || !link) {
      showNotification("error", "Please fill all required fields");
      setSubmitting(false);
      return;
    }

    if (selectedTags.length === 0) {
      showNotification("error", "Please select at least one tag");
      setSubmitting(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("error", "Please log in first");
      navigate("/");
      setSubmitting(false);
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:5000";
      
      const response = await fetch(`${API_BASE_URL}/api/v1/addcontent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          link,
          contentType: category,
          tag: selectedTags[0], // For now, send first tag for backend compatibility
          tags: selectedTags, // Send all tags for future use
        }),
      });

      if (!response.ok) throw new Error();

      setReloadData();
      setModal(false);
      showNotification("success", "Content added successfully!");
      // submitting state will be cleared on unmount (modal closed)
    } catch {
      showNotification("error", "Error while adding content");
      setSubmitting(false);
    }
  }, [category, selectedTags, navigate, setModal, setReloadData, showNotification, submitting]);

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 p-4 bg-black/50 backdrop-blur-sm" onClick={onClick}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Add New Content</h2>
              <p className="text-blue-100 mt-1">Save something to your second brain</p>
            </div>
            <button onClick={onClick} className="text-white text-2xl w-8 h-8 rounded-full hover:bg-white/10">
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto scrollbar-hide">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              ref={titleRef}
              type="text"
              placeholder="Enter a descriptive title"
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link *</label>
            <input
              ref={linkRef}
              type="url"
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Content Type</label>
            <div className="grid grid-cols-3 gap-3">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    category === cat
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Tags</label>
            
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-200 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Predefined Tags */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {predefinedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Custom Tag */}
            <div className="border-t pt-4">
              {!showCustomTag ? (
                <button
                  onClick={() => setShowCustomTag(true)}
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  + Add custom tag
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    ref={customTagRef}
                    type="text"
                    placeholder="Enter custom tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                  />
                  <button
                    onClick={addCustomTag}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowCustomTag(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={submitData}
            disabled={submitting}
            aria-busy={submitting}
            className={`w-full text-white py-3 rounded-lg font-semibold transition-all ${submitting ? 'bg-blue-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}`}
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 inline-block animate-spin mr-2" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                Rendering & Adding...
              </>
            ) : (
              'Add to Second Brain'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default Modal;