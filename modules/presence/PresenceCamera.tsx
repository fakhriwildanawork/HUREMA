
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';

interface PresenceCameraProps {
  onCapture: (blob: Blob) => void;
  isProcessing?: boolean;
}

const PresenceCamera: React.FC<PresenceCameraProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<'RIGHT' | 'LEFT' | 'READY'>('RIGHT');
  const [movementScore, setMovementScore] = useState(0);
  const lastFrameRef = useRef<ImageData | null>(null);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    startCamera();
    return () => {
      isComponentMounted.current = false;
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      detectMovementLoop();
    } catch (err) {
      console.error("Camera Error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const detectMovementLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const analyze = () => {
      if (!isComponentMounted.current || step === 'READY') return;
      if (!videoRef.current) return;

      const width = 160;
      const height = 120;
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const currentFrame = ctx.getImageData(0, 0, width, height);

      if (lastFrameRef.current) {
        let diff = 0;
        const d1 = lastFrameRef.current.data;
        const d2 = currentFrame.data;
        
        // Membagi zona: Kiri (0-53px), Tengah (54-106px), Kanan (107-160px)
        const leftLimit = Math.floor(width / 3);
        const rightLimit = Math.floor((width / 3) * 2);

        let activeZoneDiff = 0;
        let pixelCount = 0;

        for (let i = 0; i < d1.length; i += 8) {
          const pixelIdx = i / 4;
          const x = pixelIdx % width;
          
          const pDiff = Math.abs(d1[i] - d2[i]);
          
          if (step === 'RIGHT' && x > rightLimit) {
            activeZoneDiff += pDiff;
            pixelCount++;
          } else if (step === 'LEFT' && x < leftLimit) {
            activeZoneDiff += pDiff;
            pixelCount++;
          }
        }

        const score = activeZoneDiff / (pixelCount || 1);
        setMovementScore(score);

        // Ambang batas sensitivitas pergerakan
        if (score > 25) {
          if (step === 'RIGHT') {
            setTimeout(() => setStep('LEFT'), 1000);
          } else if (step === 'LEFT') {
            setTimeout(() => setStep('READY'), 1000);
          }
        }
      }

      lastFrameRef.current = currentFrame;
      requestAnimationFrame(analyze);
    };

    requestAnimationFrame(analyze);
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
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover scale-x-[-1]"
      />
      <canvas ref={canvasRef} width={160} height={120} className="hidden" />
      
      {/* Liveness Overlays */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-8 pointer-events-none">
        <div className="mt-12 bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-center">
          {step === 'RIGHT' && (
            <div className="flex flex-col items-center gap-2">
              <ArrowRight className="text-[#00FFE4] animate-bounce" size={32} />
              <p className="text-white text-sm font-bold uppercase tracking-widest">Tengok ke Kanan</p>
            </div>
          )}
          {step === 'LEFT' && (
            <div className="flex flex-col items-center gap-2">
              <ArrowLeft className="text-[#00FFE4] animate-bounce" size={32} />
              <p className="text-white text-sm font-bold uppercase tracking-widest">Tengok ke Kiri</p>
            </div>
          )}
          {step === 'READY' && (
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={32} />
              <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Identitas Valid</p>
            </div>
          )}
        </div>

        {/* Face Guide UI */}
        <div className={`w-64 h-80 border-2 border-dashed rounded-[120px] transition-colors duration-500 ${step === 'READY' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/30'}`}></div>

        {/* Controls Container */}
        <div className="w-full space-y-6 pointer-events-auto">
          {/* Progress Bar Liveness */}
          <div className="px-4">
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00FFE4] transition-all duration-300" 
                style={{ width: step === 'RIGHT' ? '33%' : step === 'LEFT' ? '66%' : '100%' }}
              />
            </div>
          </div>

          <div className="flex justify-center gap-4 pb-4">
            <button 
              onClick={() => { setStep('RIGHT'); startCamera(); }}
              className="p-4 text-white/70 hover:text-white bg-white/10 backdrop-blur-md rounded-full border border-white/20 transition-all"
            >
              <RefreshCw size={24} />
            </button>
            <button 
              onClick={handleCapture}
              disabled={step !== 'READY' || isProcessing}
              className={`flex items-center gap-3 px-10 py-4 rounded-full font-bold uppercase text-sm tracking-widest shadow-2xl transition-all ${
                step === 'READY' 
                ? 'bg-white text-[#006E62] hover:scale-105 active:scale-95' 
                : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'
              }`}
            >
              <Camera size={20} />
              {isProcessing ? 'PROSES...' : 'AMBIL FOTO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenceCamera;
