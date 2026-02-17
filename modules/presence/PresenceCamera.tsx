
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface PresenceCameraProps {
  onCapture: (blob: Blob) => void;
  isProcessing?: boolean;
}

const PresenceCamera: React.FC<PresenceCameraProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'moving' | 'detected'>('idle');
  const [movementScore, setMovementScore] = useState(0);
  const lastFrameRef = useRef<ImageData | null>(null);
  // FIX: Use refs to track state within the persistent animation loop closure
  const livenessStatusRef = useRef<'idle' | 'moving' | 'detected'>('idle');
  const detectionTimeoutRef = useRef<any>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
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
      // FIX: Use ref to avoid stale closure and TypeScript narrowing errors
      if (livenessStatusRef.current === 'detected') return;
      
      if (!videoRef.current) return;
      ctx.drawImage(videoRef.current, 0, 0, 160, 120);
      const currentFrame = ctx.getImageData(0, 0, 160, 120);

      if (lastFrameRef.current) {
        let diff = 0;
        const data1 = lastFrameRef.current.data;
        const data2 = currentFrame.data;
        
        // Pixel step 4 to speed up
        for (let i = 0; i < data1.length; i += 8) {
          diff += Math.abs(data1[i] - data2[i]);
        }

        const score = diff / (160 * 120);
        setMovementScore(score);

        if (score > 15) {
          if (livenessStatusRef.current === 'idle') {
            setLivenessStatus('moving');
            livenessStatusRef.current = 'moving';
          }
          
          // Jika gerakan cukup, anggap liveness OK setelah 1 detik gerakan konsisten
          if (score > 20 && !detectionTimeoutRef.current) {
             detectionTimeoutRef.current = setTimeout(() => {
                setLivenessStatus('detected');
                livenessStatusRef.current = 'detected';
             }, 1500);
          }
        }
      }

      lastFrameRef.current = currentFrame;
      // FIX: Comparison on livenessStatus variable here caused TS error due to previous narrowing
      if (livenessStatusRef.current !== 'detected') {
        requestAnimationFrame(analyze);
      }
    };

    requestAnimationFrame(analyze);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden border-2 border-gray-100 shadow-inner">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <canvas ref={canvasRef} width={160} height={120} className="hidden" />
        
        {/* Overlay Instructions */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-[100px] mb-4"></div>
          {livenessStatus === 'idle' && (
            <div className="bg-black/60 px-4 py-2 rounded-full text-white text-[10px] font-bold uppercase tracking-widest animate-pulse">
              Posisikan Wajah & Tolah-Toleh
            </div>
          )}
          {livenessStatus === 'moving' && (
            <div className="bg-emerald-500/80 px-4 py-2 rounded-full text-white text-[10px] font-bold uppercase tracking-widest">
              Gerakan Terdeteksi... Teruskan
            </div>
          )}
          {livenessStatus === 'detected' && (
            <div className="bg-[#00FFE4] px-4 py-2 rounded-full text-[#006E62] text-[10px] font-bold uppercase tracking-widest shadow-lg">
              Liveness OK! Siap Ambil Gambar
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="bg-black/40 backdrop-blur-md h-1.5 w-full rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00FFE4] transition-all duration-300" 
              style={{ width: `${Math.min(movementScore * 3, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button 
          onClick={startCamera}
          className="p-3 text-gray-400 hover:text-[#006E62] bg-gray-50 rounded-full border border-gray-200 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
        <button 
          onClick={handleCapture}
          disabled={livenessStatus !== 'detected' || isProcessing}
          className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold uppercase text-xs tracking-widest shadow-lg transition-all ${
            livenessStatus === 'detected' 
            ? 'bg-[#006E62] text-white hover:bg-[#005a50]' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Camera size={18} />
          {isProcessing ? 'MEMPROSES...' : 'AMBIL FOTO PRESENSI'}
        </button>
      </div>
    </div>
  );
};


export default PresenceCamera;
