import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { signInAsAdmin } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onBackToUserLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onBackToUserLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('ইমেইল এবং পাসওয়ার্ড উভয়ই লিখুন');
      setShakeKey((prev) => prev + 1);
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await signInAsAdmin(email, password);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'অ্যাডমিন লগইন ব্যর্থ হয়েছে।');
      setShakeKey((prev) => prev + 1);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#F5EFE3] text-[#2C2723] relative overflow-hidden">
      {/* Background paper texture */}
      <div className="absolute inset-0 paper-texture opacity-70 pointer-events-none" />

      {/* Decorative Postal stamp in corner */}
      <div className="absolute top-6 left-6 opacity-40 pointer-events-none hidden sm:block">
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#5A4533] flex items-center justify-center -rotate-12 p-1">
          <div className="w-full h-full rounded-full border border-[#5A4533] flex flex-col items-center justify-center text-[9px] text-[#5A4533] font-vintage text-center leading-tight">
            <span>ADMIN</span>
            <span className="font-bold">চিঠি দিবস</span>
            <span>CONTROL</span>
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
        {/* Admin Card */}
        <div className="relative bg-[#FAF7F0] rounded-2xl shadow-2xl border border-[#DECDB3] p-6 sm:p-8 overflow-hidden">
          
          {/* Top Admin Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2C2117] via-[#8C3A27] to-[#2C2117]" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#EFE3CF] border border-[#D5C2A4] flex items-center justify-center text-[#2A1E14] mb-3 shadow-inner">
              <Shield className="w-8 h-8 text-[#8C3A27]" strokeWidth={1.8} />
            </div>
            
            <span className="text-[11px] uppercase tracking-widest text-[#7D6650] font-vintage font-bold mb-1">
              Admin Portal • অ্যাডমিন প্রবেশদ্বার
            </span>
            <h2 className="text-2xl font-bold font-serif-bengali text-[#241B13]">
              অ্যাডমিন লগইন
            </h2>
            <p className="text-xs text-[#705E4C] mt-1 font-sans-bengali">
              চিঠি এডিট, ছবি আপলোড ও মতামত নিয়ন্ত্রণের জন্য লগইন করুন
            </p>
          </div>

          {/* Admin Form */}
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label 
                htmlFor="admin-email" 
                className="block text-xs font-semibold text-[#544333]"
              >
                অ্যাডমিন ইমেইল (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94816C]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#FFFFFF] rounded-xl border border-[#DAC7AB] text-sm text-[#261E16] placeholder-[#A69480] focus:outline-none focus:border-[#8C3A27] focus:ring-1 focus:ring-[#8C3A27]/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label 
                htmlFor="admin-password" 
                className="block text-xs font-semibold text-[#544333]"
              >
                অ্যাডমিন পাসওয়ার্ড (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94816C]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="পাসওয়ার্ড লিখুন..."
                  className="w-full pl-10 pr-11 py-2.5 bg-[#FFFFFF] rounded-xl border border-[#DAC7AB] text-sm text-[#261E16] placeholder-[#A69480] focus:outline-none focus:border-[#8C3A27] focus:ring-1 focus:ring-[#8C3A27]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C7A67] hover:text-[#3B2C1F] cursor-pointer"
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
                  className="text-xs text-red-600 bg-red-50/90 border border-red-200 rounded-lg p-2.5 flex items-center gap-1.5"
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
              className="w-full py-3 px-5 rounded-xl bg-[#2C2117] hover:bg-[#1E160F] text-[#FAF6EE] font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </div>
              ) : (
                <>
                  <span>ড্যাশবোর্ডে প্রবেশ করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Back to User Login Button */}
          <div className="mt-6 pt-4 border-t border-[#EAE0CD] text-center">
            <button
              type="button"
              onClick={onBackToUserLogin}
              className="inline-flex items-center gap-1.5 text-xs text-[#705C49] hover:text-[#2E2319] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>চিঠি পড়ার পেজে ফিরে যান (User Page)</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
