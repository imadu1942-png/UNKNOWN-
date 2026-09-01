import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const OpinionBox: React.FC = () => {
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      setError('অনুগ্রহ করে তোমার মতামত বা অনুভূতিটি লিখো');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const authorName = name.trim() || 'শুভাকাঙ্ক্ষী';
    const formattedOpinion = `${authorName}: ${cleanMessage}`;

    try {
      if (!supabase) {
        setError('মতামত পাঠানোর জন্য Supabase ডেটাবেজ কনফিগারেশন প্রয়োজন।');
        setIsSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('opinions')
        .insert([
          {
            opinion_text: formattedOpinion,
          },
        ]);

      if (insertError) {
        console.error('Opinion submission error:', insertError);
        setError(`মতামত পাঠানো ব্যর্থ হয়েছে: ${insertError.message}`);
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
      setMessage('');
      setName('');
    } catch (err: any) {
      console.error('Error submitting opinion:', err);
      setError(`সংযোগ ত্রুটি: ${err?.message || 'মতামত পাঠানো যায়নি'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full mt-10 pt-8 border-t border-[#E8DCC9] font-sans-bengali">
      {/* Section Title */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#EFE4D2] flex items-center justify-center text-[#8C3A27] border border-[#DFCDB3] shrink-0">
          <MessageSquareText className="w-4 h-4" />
        </div>
        <h3 className="text-xl font-bold font-serif-bengali text-[#261E17]">
          তোমার মতামত
        </h3>
      </div>
      <p className="text-xs text-[#705F4F] mb-5">
        চিঠিটি পড়ার পর তোমার অনুভূতি বা স্মৃতি নির্দ্বিধায় জানিয়ে যেতে পারো।
      </p>

      {/* Submission Success Alert */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-5 p-4 rounded-xl bg-[#EDF7ED] border border-[#C5E1C5] text-[#1E4620] flex items-start gap-3 shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">ধন্যবাদ!</p>
              <p className="text-xs text-[#2E7D32]/90 mt-0.5">
                তোমার সুন্দর মতামতটি নিরাপদে প্রেরিত হয়েছে।
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#FAF7F0] rounded-2xl border border-[#E5D7BF] p-4 sm:p-6 shadow-xs space-y-4"
      >
        {/* Optional Name */}
        <div className="space-y-1">
          <label 
            htmlFor="opinion-name-input" 
            className="block text-xs font-semibold text-[#5A4B3C]"
          >
            তোমার নাম বা ডাকনাম (ঐচ্ছিক)
          </label>
          <input
            id="opinion-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="যেমন: অনিক / শুভাকাঙ্ক্ষী"
            className="w-full px-3.5 py-2.5 bg-[#FFFFFF] rounded-xl border border-[#DDCBB1] text-xs sm:text-sm text-[#2A231C] placeholder-[#AB9B89] focus:outline-none focus:border-[#8C3A27] focus:ring-1 focus:ring-[#8C3A27]/20"
          />
        </div>

        {/* Opinion Textarea */}
        <div className="space-y-1">
          <label 
            htmlFor="opinion-textarea" 
            className="block text-xs font-semibold text-[#5A4B3C]"
          >
            মতামত বা বার্তা <span className="text-[#8C3A27]">*</span>
          </label>
          <textarea
            id="opinion-textarea"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError('');
            }}
            rows={4}
            placeholder="চিঠিটি পড়ে যা অনুভূতি হলো লিখে ফেলো..."
            className={`w-full p-3.5 bg-[#FFFFFF] rounded-xl border text-xs sm:text-sm text-[#2A231C] placeholder-[#AB9B89] focus:outline-none transition-all resize-none ${
              error
                ? 'border-red-400 ring-1 ring-red-200'
                : 'border-[#DDCBB1] focus:border-[#8C3A27] focus:ring-1 focus:ring-[#8C3A27]/20'
            }`}
          />
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>

        {/* Submit Button & Privacy Assurance */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-[#917E6B] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8C3A27] shrink-0" />
            <span>মতামত সম্পূর্ণ ব্যক্তিগত ও গোপন থাকবে</span>
          </span>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#8C3A27] hover:bg-[#752D1D] active:scale-[0.98] text-[#FDF9EE] text-xs sm:text-sm font-medium shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-70 shrink-0"
          >
            {isSubmitting ? (
              <span>পাঠানো হচ্ছে...</span>
            ) : (
              <>
                <span>মতামত পাঠান</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
