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
  const [textLength, setTextLength] = useState(0);
  const TEXT_MAX = 4000;

  const categories = useMemo(() => ["Youtube", "Twitter", "Notion", "Instagram", "Text"] as const, []);
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
    const textInput = (document.getElementById('textContentInput') as HTMLTextAreaElement | null)?.value.trim() || "";

    if (category === 'Text') {
      if (!title || !textInput) {
        showNotification("error", "Please provide a title and text for your entry");
        setSubmitting(false);
        return;
      }
      if (textInput.length > TEXT_MAX) {
        showNotification("error", `Text exceeds ${TEXT_MAX} characters`);
        setSubmitting(false);
        return;
      }
    } else {
      if (!title || !link) {
        showNotification("error", "Please fill all required fields");
        setSubmitting(false);
        return;
      }
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
      
      const bodyPayload: any = {
        title,
        contentType: category,
        tag: selectedTags[0], // For now, send first tag for backend compatibility
        tags: selectedTags, // Send all tags for future use
      };

      if (category === 'Text') bodyPayload.text = textInput;
      else bodyPayload.link = link;

      const response = await fetch(`${API_BASE_URL}/api/v1/addcontent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(bodyPayload),
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

          {/* Link or Text */}
          {category !== 'Text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link *</label>
              <input
                ref={linkRef}
                type="url"
                placeholder="https://example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text *</label>
              <textarea
                placeholder="Paste or type your note / text here"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                onChange={(e) => { setTextLength(e.target.value.length); }}
                ref={null as any}
                id="textContentInput"
                maxLength={TEXT_MAX}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <div>{textLength}/{TEXT_MAX} chars</div>
                {textLength >= TEXT_MAX && <div className="text-red-500">Maximum reached</div>}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Content Type</label>
            <div className="grid grid-cols-3 gap-3">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    category === cat
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {/* small icon per type */}
                  {cat === 'Text' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 3v2h10V6H7zm0 4v2h10v-2H7z"/></svg>
                  ) : cat === 'Youtube' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5-3-5-3v6z"/><path d="M21 7s-.2-1.4-.8-2c-.8-.8-1.8-.8-2.2-.9C14 3.9 12 3.9 12 3.9h0s-2 0-5 0c-.4 0-1.4.1-2.2.1C3.2 4 3 5.1 3 5.1S3 6.6 3 8.2v.6C3 10.9 3 12 3 12s0 1.1 0 2.2v.6C3 17.4 3 18 3 18s.2 1.1.8 1.8c.8.8 1.8.8 2.2.9 1.6.2 6.2.2 6.2.2s2 0 5 0c.4 0 1.4-.1 2.2-.1.6-.1.8-1 .8-1.8v-1.2c0-1.1 0-2.2 0-2.2s0-1.1 0-2.2V8.2C21 6.6 21 5.1 21 5.1z"/></svg>
                  ) : cat === 'Twitter' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.4.36a9.03 9.03 0 0 1-2.88 1.1A4.52 4.52 0 0 0 16.11 0c-2.5 0-4.52 2.03-4.52 4.52 0 .35.04.7.11 1.03C7.69 5.38 4.07 3.57 1.64.88A4.5 4.5 0 0 0 1 3.14c0 1.57.8 2.95 2.02 3.75A4.5 4.5 0 0 1 .96 6v.06c0 2.2 1.57 4.04 3.65 4.46a4.52 4.52 0 0 1-2.04.08c.58 1.8 2.26 3.11 4.25 3.15A9.06 9.06 0 0 1 0 19.54a12.8 12.8 0 0 0 6.92 2.02c8.3 0 12.85-6.88 12.85-12.85l-.01-.58A9.22 9.22 0 0 0 23 3z"/></svg>
                  ) : cat === 'Instagram' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm5 4.25A4.75 4.75 0 1 1 7.25 11 4.75 4.75 0 0 1 12 6.25zm5.4-.9a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
                  ) : (
                    <span className="w-4 h-4" />
                  )}

                  <span>{cat}</span>
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