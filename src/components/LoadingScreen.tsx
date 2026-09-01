import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Feather, HeartHandshake } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 3500; // 3.5 seconds
    const intervalTime = 35;
    const increment = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  const getStatusText = () => {
    if (progress < 30) return 'চিঠির খাম প্রস্তুত হচ্ছে...';
    if (progress < 70) return 'কালির আঁচড়ে অনুভূতিগুলো সাজানো হচ্ছে...';
    if (progress < 95) return 'ডাকটিকিট লাগানো সম্পন্ন...';
    return 'খামটি খোলা হচ্ছে...';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7F3E9] text-[#2C2723] px-4 overflow-hidden">
      {/* Subtle vintage parchment background overlay */}
      <div className="absolute inset-0 paper-texture opacity-60 pointer-events-none" />
      
      {/* Decorative Postal Circles in background */}
      <div className="absolute -top-16 -left-16 w-64 h-64 border border-[#DFD3BE] rounded-full opacity-40 pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 border border-[#DFD3BE] rounded-full opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        
        {/* Animated Wax Seal / Envelope Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-[#8C3A27] shadow-xl flex items-center justify-center border-4 border-[#732F1F] ring-4 ring-[#E8DCC9]/60">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <Mail className="w-11 h-11 text-[#FDF9EE]" strokeWidth={1.75} />
            </motion.div>
          </div>

          {/* Floating Feather Pen */}
          <motion.div
            animate={{
              y: [0, -6, 0],
              rotate: [0, 8, 0],
            }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            className="absolute -top-2 -right-3 w-10 h-10 rounded-full bg-[#E5D7BE] border border-[#CBB99B] flex items-center justify-center text-[#5C452D] shadow-md"
          >
            <Feather className="w-5 h-5" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-1.5 mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE0CD] text-[#705335] text-xs tracking-wider uppercase font-vintage border border-[#D9CBB3]">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>World Letter Day</span>
          </div>
          <h1 className="text-3xl font-bold font-serif-bengali text-[#2A231C] tracking-wide">
            চিঠি দিবস
          </h1>
          <p className="text-xs text-[#7A6B5D] font-sans-bengali">
            একটি বিশেষ চিঠি তোমার অপেক্ষায়
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E5DCBE]/70 h-2 rounded-full overflow-hidden p-0.5 border border-[#D7CAA7] shadow-inner mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-[#8C3A27] to-[#B3543B] rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>

        {/* Status Text & Percentage */}
        <div className="flex justify-between items-center w-full px-1 text-xs text-[#6F6052] font-sans-bengali min-h-[20px]">
          <span className="animate-pulse">{getStatusText()}</span>
          <span className="font-vintage text-[11px] font-semibold text-[#8C3A27]">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Subtle quick skip if needed */}
        <button
          onClick={onComplete}
          className="mt-8 text-[11px] text-[#A69784] hover:text-[#5E4C3C] underline transition-colors cursor-pointer"
        >
          সরাসরি প্রবেশ করুন &rarr;
        </button>
      </div>
    </div>
  );
};
