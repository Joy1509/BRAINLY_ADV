import React, { useState, useRef, useCallback } from 'react';

interface FaceCaptureProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  mode: 'register' | 'login';
  requiredImages?: number;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ 
  onCapture, 
  onClose, 
  mode,
  requiredImages = 5 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string>('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const steps = mode === 'register' ? [
    'Look straight at the camera',
    'Turn slightly to your left',
    'Turn slightly to your right',
    'Tilt your head slightly up',
    'Look straight again'
  ] : ['Position your face in the camera'];

  const maxImages = mode === 'register' ? requiredImages : 1;

  const startCamera = useCallback(async () => {
    if (isStartingCamera || cameraStarted) return;
    
    setIsStartingCamera(true);
    setError('');
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        streamRef.current = mediaStream;
        setCameraStarted(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permissions and try again.');
    } finally {
      setIsStartingCamera(false);
    }
  }, [isStartingCamera, cameraStarted]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isCapturing || !cameraStarted) return;

    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Canvas not supported');
      setIsCapturing(false);
      return;
    }

    // Resize for face recognition (smaller size = smaller payload)
    const maxWidth = 640;
    const maxHeight = 480;
    let { videoWidth, videoHeight } = video;
    
    // Calculate scaled dimensions
    if (videoWidth > maxWidth || videoHeight > maxHeight) {
      const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
      videoWidth *= ratio;
      videoHeight *= ratio;
    }
    
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Convert to base64 with reduced quality and size for face recognition
    const imageData = canvas.toDataURL('image/jpeg', 0.6); // Reduced quality from 0.8 to 0.6
    const newImages = [...capturedImages, imageData];
    setCapturedImages(newImages);

    if (newImages.length >= maxImages) {
      // Stop camera and call onCapture
      stopCamera();
      setTimeout(() => {
        onCapture(newImages);
      }, 300);
    } else {
      setCurrentStep(prev => prev + 1);
      setTimeout(() => setIsCapturing(false), 500);
    }
  }, [capturedImages, maxImages, onCapture, isCapturing, cameraStarted, stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImages([]);
    setCurrentStep(0);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const progressPercent = (capturedImages.length / maxImages) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {mode === 'register' ? '📷 Register Face' : '🔐 Face Login'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {mode === 'register' && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Step {capturedImages.length + 1} of {maxImages}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="relative mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 bg-gray-900 rounded-lg object-cover"
          />
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white border-dashed rounded-full w-48 h-60 opacity-50"></div>
          </div>

          {cameraStarted && currentStep < steps.length && (
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded text-center text-sm">
              {steps[currentStep]}
            </div>
          )}

          {isCapturing && (
            <div className="absolute inset-0 bg-white bg-opacity-30 flex items-center justify-center">
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold">
                📸 Captured!
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="mb-4 text-center">
          {!cameraStarted ? (
            <p className="text-gray-600">
              {isStartingCamera ? 'Starting camera...' : 'Click Start Camera to begin'}
            </p>
          ) : capturedImages.length >= maxImages ? (
            <p className="text-green-600 font-semibold">
              ✅ All images captured successfully!
            </p>
          ) : (
            <p className="text-gray-600 text-sm">
              Position your face within the oval and click capture
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {!cameraStarted ? (
            <button
              onClick={startCamera}
              disabled={isStartingCamera}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {isStartingCamera ? '⏳ Starting...' : '📷 Start Camera'}
            </button>
          ) : capturedImages.length >= maxImages ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleRetake}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                🔄 Retake
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                ✅ Done
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={captureImage}
                disabled={isCapturing}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isCapturing ? '📸 Capturing...' : '📸 Capture'}
              </button>
            </>
          )}
        </div>

        {mode === 'register' && capturedImages.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Captured images:</p>
            <div className="flex gap-2 overflow-x-auto">
              {capturedImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Capture ${index + 1}`}
                  className="w-16 h-16 object-cover rounded border-2 border-green-300"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceCapture;