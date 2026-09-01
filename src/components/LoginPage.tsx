import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Eye, EyeOff, Lock, ArrowRight, Shield, ShieldCheck } from 'lucide-react';
import { signInAsReader } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginPageProps {
  onSuccess: () => void;
  onGoToAdmin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onGoToAdmin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('অনুগ্রহ করে পাসওয়ার্ড প্রদান করুন');
      setShakeKey((prev) => prev + 1);
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await signInAsReader(password);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।');
      setShakeKey((prev) => prev + 1);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#F8F4EB] text-[#2C2723] relative overflow-hidden">
      {/* Background paper texture & vintage stamp marks */}
      <div className="absolute inset-0 paper-texture opacity-70 pointer-events-none" />

      {/* Decorative Postal Stamp in corner */}
      <div className="absolute top-6 right-6 opacity-30 pointer-events-none hidden sm:block">
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#8C3A27] flex items-center justify-center rotate-12 p-1">
          <div className="w-full h-full rounded-full border border-[#8C3A27] flex flex-col items-center justify-center text-[10px] text-[#8C3A27] font-vintage text-center leading-tight">
            <span>POSTAL</span>
            <span className="font-bold">চিঠি দিবস</span>
            <span>2026</span>
          </div>
        </div>
      </div>

      <motion.div
        key={shakeKey}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={
          shakeKey > 0
            ? {
                x: [-10, 10, -8, 8, -4, 4, 0],
                opacity: 1,
                y: 0,
                scale: 1,
              }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Envelope Aesthetic Card */}
        <div className="relative bg-[#FDFBF7] rounded-2xl shadow-xl border border-[#E3D7C1] p-6 sm:p-8 overflow-hidden">
          
          {/* Subtle Top Border Line Accent (Vintage postal ribbon) */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8C3A27] via-[#D1A768] to-[#8C3A27]" />

          {/* Header Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#F4ECDC] border border-[#DFCDB3] flex items-center justify-center text-[#8C3A27] mb-3 shadow-inner">
              <Lock className="w-7 h-7" strokeWidth={1.8} />
            </div>
            
            <span className="text-[11px] uppercase tracking-widest text-[#94785D] font-vintage font-semibold mb-1">
              Secret Envelope • ব্যক্তিগত চিঠি
            </span>
            <h2 className="text-2xl font-bold font-serif-bengali text-[#261E17]">
              চিঠি পড়তে আনলক করুন
            </h2>
            <p className="text-sm text-[#736353] mt-1 font-sans-bengali">
              চিঠির খামটি খুলতে নির্ধারিত গোপন পাসওয়ার্ডটি লিখুন
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label 
                htmlFor="user-password-input" 
                className="block text-xs font-semibold text-[#574839] tracking-wide"
              >
                পাসওয়ার্ড (Password)
              </label>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#998672]">
                  <KeyRound className="w-4 h-4" />
                </div>
                
                <input
                  id="user-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="পাসওয়ার্ড লিখুন..."
                  className={`w-full pl-10 pr-11 py-3 bg-[#FAF7F0] rounded-xl border text-[#28211A] placeholder-[#A89886] text-sm focus:outline-none transition-all ${
                    error
                      ? 'border-red-400 ring-2 ring-red-200'
                      : 'border-[#DECDB3] focus:border-[#8C3A27] focus:ring-2 focus:ring-[#8C3A27]/15'
                  }`}
                  autoFocus
                />

                {/* Show/Hide Password Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C7B6A] hover:text-[#382D22] transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-600 bg-red-50/80 border border-red-200 rounded-lg p-2.5 flex items-center gap-1.5"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-xl bg-[#8C3A27] hover:bg-[#783020] active:scale-[0.99] text-[#FDF9EE] font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </div>
              ) : (
                <>
                  <span>চিঠি খুলুন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Supabase Security Badge & Admin Entry */}
          <div className="mt-6 pt-4 border-t border-[#EFE5D3] flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-[#8C765D]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>
                {isSupabaseConfigured
                  ? 'Supabase Auth দ্বারা সুরক্ষিত'
                  : 'Supabase Auth রেডি'}
              </span>
            </div>

            <button
              type="button"
              onClick={onGoToAdmin}
              className="inline-flex items-center gap-1.5 text-xs text-[#8C3A27] hover:text-[#6E2819] font-medium transition-colors cursor-pointer mt-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>অ্যাডমিন পোর্টাল (Admin Login)</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-[#9E8E7D] mt-4 font-sans-bengali">
          চিঠি দিবস • ভালোবাসার ও স্মৃতির সংকলন
        </p>
      </motion.div>
    </div>
  );
};
