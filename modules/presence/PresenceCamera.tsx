
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, ShieldCheck, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface PresenceCameraProps {
  onCapture: (blob: Blob) => void;
  isProcessing?: boolean;
}

const PresenceCamera: React.FC<PresenceCameraProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<'RIGHT' | 'LEFT' | 'READY'>('RIGHT');
  const [isAiLoaded, setIsAiLoaded] = useState(false);
  const [faceLandmarker, setFaceLandmarker] = useState<any>(null);
  const isComponentMounted = useRef(true);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    isComponentMounted.current = true;
    initializeAi();

    return () => {
      isComponentMounted.current = false;
      stopCamera();
    };
  }, []);

  const initializeAi = async () => {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      
      if (isComponentMounted.current) {
        setFaceLandmarker(landmarker);
        setIsAiLoaded(true);
        startCamera();
      }
    } catch (err) {
      console.error("AI Init Error:", err);
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          aspectRatio: 9/16,
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          predictLoop();
        };
      }
    } catch (err) {
      console.error("Camera Error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const predictLoop = () => {
    if (!isComponentMounted.current || !videoRef.current || !faceLandmarker) return;

    const video = videoRef.current;
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const results = faceLandmarker.detectForVideo(video, performance.now());

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const nose = landmarks[4];
        const rightEdge = landmarks[234];
        const leftEdge = landmarks[454];

        const faceWidth = Math.abs(leftEdge.x - rightEdge.x);
        const noseRelativeX = (nose.x - Math.min(rightEdge.x, leftEdge.x)) / faceWidth;

        if (step === 'RIGHT' && noseRelativeX < 0.35) {
          setStep('LEFT');
        } else if (step === 'LEFT' && noseRelativeX > 0.65) {
          setStep('READY');
        }
      }
    }

    if (step !== 'READY') {
      requestAnimationFrame(predictLoop);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx?.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
      {!isAiLoaded ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-4">
          <Loader2 className="animate-spin text-[#00FFE4]" size={40} />
          <p className="text-[10px] font-bold uppercase tracking-widest">Inisialisasi Keamanan AI...</p>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          
          <div className="absolute inset-0 flex flex-col items-center justify-between p-8 pointer-events-none">
            {/* Instruction Overlay */}
            <div className="mt-12 bg-black/50 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/20 text-center animate-in fade-in zoom-in duration-500">
              {step === 'RIGHT' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-[#00FFE4]/20 rounded-full flex items-center justify-center">
                    <ArrowRight className="text-[#00FFE4] animate-bounce" size={28} />
                  </div>
                  <p className="text-white text-xs font-bold uppercase tracking-widest">Tengok ke Kanan</p>
                </div>
              )}
              {step === 'LEFT' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-[#00FFE4]/20 rounded-full flex items-center justify-center">
                    <ArrowLeft className="text-[#00FFE4] animate-bounce" size={28} />
                  </div>
                  <p className="text-white text-xs font-bold uppercase tracking-widest">Tengok ke Kiri</p>
                </div>
              )}
              {step === 'READY' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <ShieldCheck className="text-emerald-400" size={32} />
                  </div>
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Identitas Valid</p>
                </div>
              )}
            </div>

            {/* Face Guide Frame */}
            <div className={`w-72 h-96 border-2 border-dashed rounded-[140px] transition-all duration-700 ${
              step === 'READY' 
              ? 'border-emerald-500 bg-emerald-500/5 scale-105' 
              : 'border-white/20 bg-white/5'
            }`}></div>

            {/* Bottom Controls */}
            <div className="w-full space-y-6 pointer-events-auto">
              <div className="px-6">
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#00FFE4] transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,255,228,0.5)]" 
                    style={{ width: step === 'RIGHT' ? '33%' : step === 'LEFT' ? '66%' : '100%' }}
                  />
                </div>
              </div>

              <div className="flex justify-center gap-4 pb-4">
                <button 
                  onClick={() => { setStep('RIGHT'); predictLoop(); }}
                  className="p-4 text-white/50 hover:text-white bg-white/5 backdrop-blur-lg rounded-full border border-white/10 transition-all hover:bg-white/10"
                >
                  <RefreshCw size={24} />
                </button>
                <button 
                  onClick={handleCapture}
                  disabled={step !== 'READY' || isProcessing}
                  className={`flex items-center gap-3 px-12 py-4 rounded-full font-extrabold uppercase text-xs tracking-[0.2em] shadow-2xl transition-all ${
                    step === 'READY' 
                    ? 'bg-[#00FFE4] text-[#006E62] hover:scale-105 active:scale-95 shadow-[#00FFE4]/20' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <Camera size={20} />
                  {isProcessing ? 'PROSES...' : 'AMBIL FOTO'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PresenceCamera;