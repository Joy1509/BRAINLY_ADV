import { useRef, useState, useCallback, useMemo, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../NotificationUi/NotificationProvider";
import DocumentIcon from "../icons/DocumentIcon";
import YoutubeIcon from "../icons/YoutubeIcon";
import TwitterIcon from "../icons/TwitterIcon";
import InstagramIcon from "../icons/InstagramIcon";
import NotionIcon from "../icons/NotionIcon";
import MicIcon from "../icons/MicIcon";

interface ModalProps {
  onClick: () => void;
  setModal: (value: boolean) => void;
  setReloadData: () => void;
}

const predefinedTags = ["Productivity","Tech & Tools","Mindset","Learning & Skills","Workflows","Inspiration","Business","Health","Finance"];
const categories = ["Youtube","Twitter","Notion","Instagram","Text","Voice"] as const;
type Category = typeof categories[number];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const Modal = memo(({ onClick, setModal, setReloadData }: ModalProps) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const titleRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const customTagRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState<Category>("Youtube");
  const [showCustomTag, setShowCustomTag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [textLength, setTextLength] = useState(0);
  const [instaDescription, setInstaDescription] = useState("");
  const TEXT_MAX = 4000;

  // Voice state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const addCustomTag = useCallback(() => {
    const t = customTagRef.current?.value.trim();
    if (t && !selectedTags.includes(t)) {
      setSelectedTags(prev => [...prev, t]);
      if (customTagRef.current) customTagRef.current.value = "";
      setShowCustomTag(false);
    }
  }, [selectedTags]);

  const removeTag = useCallback((tag: string) => setSelectedTags(prev => prev.filter(t => t !== tag)), []);

  // ── VOICE RECORDING ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => setRecordSeconds(s => s + 1), 1000);

      // Start Web Speech API transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        let fullTranscript = '';
        recognition.onresult = (e: any) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) fullTranscript += e.results[i][0].transcript + ' ';
          }
          setTranscript(fullTranscript.trim());
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch {
      showNotification("error", "Microphone access denied");
    }
  }, [showNotification]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setAudioDuration(recordSeconds);
    setRecording(false);
  }, [recordSeconds]);

  const discardRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordSeconds(0);
    setAudioDuration(0);
    setTranscript("");
  }, [audioUrl]);

  // ── SUBMIT ──
  const submitData = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    const title = titleRef.current?.value.trim() || "";
    const link = linkRef.current?.value.trim() || "";
    const textInput = (document.getElementById("textContentInput") as HTMLTextAreaElement | null)?.value.trim() || "";

    if (!title) { showNotification("error", "Please enter a title"); setSubmitting(false); return; }
    if (selectedTags.length === 0) { showNotification("error", "Please select at least one tag"); setSubmitting(false); return; }

    if (category === "Text" && !textInput) { showNotification("error", "Please enter some text"); setSubmitting(false); return; }
    if (category === "Voice" && !audioBlob) { showNotification("error", "Please record a voice note first"); setSubmitting(false); return; }
    if (category !== "Text" && category !== "Voice" && !link) { showNotification("error", "Please enter a link"); setSubmitting(false); return; }

    const token = localStorage.getItem("token");
    if (!token) { showNotification("error", "Please log in first"); navigate("/"); setSubmitting(false); return; }

    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      if (category === "Voice") {
        const form = new FormData();
        form.append("audio", audioBlob!, "voice-note.webm");
        form.append("title", title);
        form.append("tags", JSON.stringify(selectedTags));
        form.append("audioDuration", String(audioDuration));
        if (transcript) form.append("transcript", transcript);

        const res = await fetch(`${API_BASE_URL}/api/v1/addvoice`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
          body: form,
        });
        if (!res.ok) throw new Error();
      } else {
        const body: any = { title, contentType: category, tag: selectedTags[0], tags: selectedTags };
        if (category === "Instagram" || category === "Twitter") body.summary = instaDescription;
        if (category === "Text") body.text = textInput;
        else body.link = link;

        const res = await fetch(`${API_BASE_URL}/api/v1/addcontent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
      }

      setReloadData();
      setModal(false);
      showNotification("success", "Content added successfully!");
    } catch {
      showNotification("error", "Error while adding content");
      setSubmitting(false);
    }
  }, [submitting, category, selectedTags, audioBlob, audioDuration, instaDescription, navigate, setModal, setReloadData, showNotification]);

  const catIcon: Record<Category, JSX.Element> = useMemo(() => ({
    Youtube:   <YoutubeIcon />,
    Twitter:   <TwitterIcon />,
    Notion:    <NotionIcon />,
    Instagram: <InstagramIcon />,
    Text:      <DocumentIcon />,
    Voice:     <MicIcon />,
  }), []);

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 p-4 bg-black/50 backdrop-blur-sm" onClick={onClick}>
      <div
        className="w-full max-w-2xl dark:bg-[#13131f] bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden dark:border dark:border-white/5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-5 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Add New Content</h2>
            <p className="text-violet-200 text-sm mt-0.5">Save something to your second brain</p>
          </div>
          <button onClick={onClick} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-xl">×</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[calc(90vh-80px)] overflow-y-auto scrollbar-hide">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold dark:text-white/50 text-gray-500 uppercase tracking-wider mb-1.5">Title *</label>
            <input
              ref={titleRef}
              type="text"
              placeholder="Enter a descriptive title"
              maxLength={100}
              className="w-full px-4 py-2.5 dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 border rounded-xl dark:text-white text-gray-900 dark:placeholder-white/20 placeholder-gray-400 text-sm focus:outline-none dark:focus:border-violet-500/50 focus:border-violet-400 transition-all"
            />
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-xs font-semibold dark:text-white/50 text-gray-500 uppercase tracking-wider mb-1.5">Content Type</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); discardRecording(); }}
                  className={`px-3 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    category === cat
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                      : "dark:bg-white/5 bg-gray-100 dark:text-white/60 text-gray-600 dark:hover:bg-white/10 hover:bg-gray-200 dark:border-white/5 border border-gray-200"
                  }`}
                >
                  <span className="w-4 h-4 flex-shrink-0">{catIcon[cat]}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic input area */}
          {category === "Voice" ? (
            <div>
              <label className="block text-xs font-semibold dark:text-white/50 text-gray-500 uppercase tracking-wider mb-1.5">Voice Note *</label>
              <div className="dark:bg-white/5 bg-gray-50 dark:border-white/10 border border-gray-200 rounded-xl p-5 flex flex-col items-center gap-4">
                {!audioBlob ? (
                  <>
                    {/* Record button */}
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${
                        recording
                          ? "bg-red-500 hover:bg-red-600 shadow-red-500/40"
                          : "bg-gradient-to-br from-violet-500 to-indigo-600 hover:scale-105 shadow-violet-500/40"
                      }`}
                    >
                      {recording && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />}
                      <span className="relative w-8 h-8 text-white">
                        {recording ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                        ) : (
                          <MicIcon />
                        )}
                      </span>
                    </button>
                    <p className={`text-2xl font-mono font-bold tabular-nums ${recording ? "text-red-400" : "dark:text-white/40 text-gray-400"}`}>
                      {formatTime(recordSeconds)}
                    </p>
                    <p className="text-xs dark:text-white/30 text-gray-400">
                      {recording ? "Recording… click to stop" : "Click to start recording"}
                    </p>
                    {recording && transcript && (
                      <div className="w-full dark:bg-white/5 bg-gray-100 rounded-lg px-3 py-2">
                        <p className="text-xs dark:text-white/40 text-gray-500 italic line-clamp-3">{transcript}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Preview */}
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-green-400 text-sm font-medium flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Recorded — {formatTime(audioDuration)}
                        </span>
                      </div>
                      <audio controls src={audioUrl!} className="w-full h-10 rounded-lg" />
                    </div>
                    <button
                      onClick={discardRecording}
                      className="text-xs dark:text-red-400 text-red-500 hover:underline"
                    >
                      Discard and re-record
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : category !== "Text" ? (
            <div>
              <label className="block text-xs font-semibold dark:text-white/50 text-gray-500 uppercase tracking-wider mb-1.5">Link *</label>
              <input
                ref={linkRef}
                type="url"
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 border rounded-xl dark:text-white text-gray-900 dark:placeholder-white/20 placeholder-gray-400 text-sm focus:outline-none dark:focus:border-violet-500/50 focus:border-violet-400 transition-all"
              />
              {(category === "Instagram" || category === "Twitter") && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold dark:text-white/50 text-gray-500 uppercase tracking-wider mb-1.5">
                    {category === "Instagram" ? "Caption" : "Tweet Text"} <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    placeholder={category === "Instagram" ? "Paste the caption..." : "Paste the tweet text..."}
                    value={instaDescription}
                    onChange={e => setInstaDescription(e.target.value)}
                    className="w-full px-4 py-2.5 dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 border rounded-xl dark:text-white text-gray-900 dark:placeholder-white/20 placeholder-gray-400 text-sm focus:outline-none dark:focus:border-violet-500/50 focus:border-violet-400 transition-all min-h-[80px]"
                    maxLength={600}
                  />
                  <p className="text-xs dark:text-white/25 text-gray-400 mt-1 text-right">{instaDescription.length}/600</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold dark:text-white/50 text-gray-500 uppercase tracking-wider mb-1.5">Text *</label>
              <textarea
                id="textContentInput"
                placeholder="Paste or type your note here"
                className="w-full px-4 py-2.5 dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 border rounded-xl dark:text-white text-gray-900 dark:placeholder-white/20 placeholder-gray-400 text-sm focus:outline-none dark:focus:border-violet-500/50 focus:border-violet-400 transition-all min-h-[120px]"
                onChange={e => setTextLength(e.target.value.length)}
                maxLength={TEXT_MAX}
              />
              <div className="flex justify-between text-xs dark:text-white/25 text-gray-400 mt-1">
                <span>{textLength}/{TEXT_MAX}</span>
                {textLength >= TEXT_MAX && <span className="text-red-400">Maximum reached</span>}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold dark:text-white/50 text-gray-500 uppercase tracking-wider mb-1.5">Tags *</label>

            {selectedTags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selectedTags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2.5 py-1 bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1.5 hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {predefinedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      : "dark:bg-white/5 bg-gray-100 dark:text-white/50 text-gray-600 dark:border-white/5 border border-gray-200 dark:hover:bg-white/10 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="dark:border-t dark:border-white/5 border-t border-gray-100 pt-3">
              {!showCustomTag ? (
                <button onClick={() => setShowCustomTag(true)} className="text-violet-400 hover:text-violet-300 text-xs font-medium">
                  + Add custom tag
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    ref={customTagRef}
                    type="text"
                    placeholder="Custom tag"
                    className="flex-1 px-3 py-1.5 dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 border rounded-lg text-xs dark:text-white text-gray-900 focus:outline-none dark:focus:border-violet-500/50 focus:border-violet-400"
                    onKeyDown={e => e.key === "Enter" && addCustomTag()}
                  />
                  <button onClick={addCustomTag} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs">Add</button>
                  <button onClick={() => setShowCustomTag(false)} className="px-3 py-1.5 dark:bg-white/5 bg-gray-200 dark:text-white/50 text-gray-600 rounded-lg text-xs">Cancel</button>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={submitData}
            disabled={submitting}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-all ${
              submitting ? "bg-violet-500/30 cursor-not-allowed" : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25"
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                {category === "Voice" ? "Uploading voice note..." : "Adding to brain..."}
              </span>
            ) : "Add to Second Brain"}
          </button>
        </div>
      </div>
    </div>
  );
});

export default Modal;
