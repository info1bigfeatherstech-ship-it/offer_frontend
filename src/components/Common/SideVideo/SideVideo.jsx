
import { useState, useRef } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import Sample from "../../../assets/sam.mp4"
export default function SideVideo() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  // If the user clicks the X, we remove it from the UI
  if (!isVisible) return null;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[120] group">
      {/* Container with mobile responsive sizes */}
      <div className="relative w-32 h-48 md:w-44 md:h-64 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 bg-black">
        
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover cursor-pointer"
          src={Sample}
          onClick={toggleMute}
        />

        {/* Close Icon (Top Right) */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/80 rounded-full text-white transition-all z-10"
        >
          <X size={14} />
        </button>

        {/* Mute/Unmute Toggle (Bottom Right) */}
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full text-white transition-all border border-white/20"
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        {/* Hover Glow Effect */}
        <div className="absolute inset-0 pointer-events-none group-hover:ring-2 ring-[#00A89E]/40 rounded-2xl transition-all duration-500" />
      </div>
    </div>
  );
}