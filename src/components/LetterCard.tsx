import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stamp, 
  MapPin, 
  Calendar, 
  Lock, 
  Volume2, 
  VolumeX, 
  HeartHandshake,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { LETTER_CONTENT } from '../data/letterContent';
import { LetterData } from '../types';
import { supabase } from '../lib/supabase';
import { OpinionBox } from './OpinionBox';

interface LetterCardProps {
  onRelock: () => void;
}

export const LetterCard: React.FC<LetterCardProps> = ({ onRelock }) => {
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [content, setContent] = useState<LetterData>(LETTER_CONTENT);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle image load detection with safety timeout & cached-image check
  useEffect(() => {
    if (!content.photoUrl) {
      setIsImageLoading(false);
      return;
    }

    setImageError(false);

    // If already loaded in browser memory/cache
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsImageLoading(false);
      return;
    }

    setIsImageLoading(true);

    // Safety timeout: Never keep the loading animation stuck forever (max 2 seconds)
    const timeoutId = setTimeout(() => {
      setIsImageLoading(false);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [content.photoUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadLatestLetterContent() {
      if (!supabase) {
        console.log('[User Page] ℹ️ Supabase not configured in current environment.');
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log('[User Page] 📡 Fetching site_content from Supabase...');

        let fetchedData: any = null;
        let queryError: any = null;

        // Query Strategy 1: Try ordering by updated_at descending
        const resUpdated = await supabase
          .from('site_content')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!resUpdated.error && resUpdated.data && resUpdated.data.length > 0) {
          fetchedData = resUpdated.data[0];
        } else if (resUpdated.error) {
          // Query Strategy 2: Try ordering by created_at descending
          const resCreated = await supabase
            .from('site_content')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (!resCreated.error && resCreated.data && resCreated.data.length > 0) {
            fetchedData = resCreated.data[0];
          } else {
            // Query Strategy 3: Select first row
            const resFallback = await supabase
              .from('site_content')
              .select('*')
              .limit(1);

            if (!resFallback.error && resFallback.data && resFallback.data.length > 0) {
              fetchedData = resFallback.data[0];
            } else {
              queryError = resUpdated.error || resCreated.error || resFallback.error;
            }
          }
        }

        const isTableMissing = (err: any) => {
          if (!err) return false;
          const msg = (err.message || '').toLowerCase();
          const code = err.code || '';
          return (
            code === 'PGRST205' ||
            code === '42P01' ||
            msg.includes('schema cache') ||
            msg.includes('could not find the table') ||
            msg.includes('relation "public.site_content" does not exist')
          );
        };

        if (queryError) {
          if (isTableMissing(queryError)) {
            console.info('[User Page] ℹ️ site_content table is not yet created in Supabase. Using default letter content.');
            if (isMounted) {
              setDbError(null);
            }
          } else {
            console.warn('[User Page] ⚠️ Supabase site_content fetch note:', queryError.message || String(queryError));
            if (isMounted) {
              setDbError(`Supabase Notice (${queryError.code || 'Query'}): ${queryError.message}`);
            }
          }
        } else if (fetchedData && isMounted) {
          console.log('[User Page] ✅ Supabase site_content fetch result found');

          let parsedLetter: LetterData = { ...LETTER_CONTENT };

          if (typeof fetchedData.letter_content === 'string') {
            try {
              const obj = JSON.parse(fetchedData.letter_content);
              if (obj && typeof obj === 'object') {
                parsedLetter = { ...parsedLetter, ...obj };
              }
            } catch {
              const paras = fetchedData.letter_content
                .split(/\n\s*\n/)
                .map((p: string) => p.trim())
                .filter(Boolean);

              parsedLetter = {
                ...parsedLetter,
                paragraphs: paras.length > 0 ? paras : [fetchedData.letter_content],
              };
            }
          } else if (typeof fetchedData.letter_content === 'object' && fetchedData.letter_content !== null) {
            parsedLetter = { ...parsedLetter, ...fetchedData.letter_content };
          }

          if (fetchedData.image_url) {
            parsedLetter.photoUrl = fetchedData.image_url;
          }

          console.log('[User Page] 📥 Received letter_content applied:', parsedLetter.title);
          console.log('[User Page] 🖼️ Received image_url applied:', parsedLetter.photoUrl);

          setContent(parsedLetter);
          setDbError(null);
        } else {
          console.log('[User Page] ℹ️ Supabase site_content table has no rows yet, showing initial template.');
        }
      } catch (err: any) {
        console.error('[User Page] ❌ Exception during Supabase fetch:', err?.message || String(err));
        if (isMounted) {
          setDbError(`Connection Exception: ${err?.message || String(err)}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLatestLetterContent();

    // Subscribe to realtime database changes so changes from Admin appear immediately across devices
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('site_content_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_content' },
          (payload) => {
            console.log('[User Page] 🔔 Realtime site_content change detected:', payload);
            loadLatestLetterContent();
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Gentle soft ambient acoustic chime via Web Audio API (zero external audio dependencies)
  const toggleAmbientSound = () => {
    if (isPlayingSound) {
      setIsPlayingSound(false);
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 gentle chime
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.35);
        
        gain.gain.setValueAtTime(0.001, now + idx * 0.35);
        gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.35 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.35 + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.35);
        osc.stop(now + idx * 0.35 + 2.4);
      });
      setIsPlayingSound(true);
      setTimeout(() => setIsPlayingSound(false), 3200);
    } catch {
      // Audio context fallback
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#2C2723] py-6 sm:py-10 px-3 sm:px-6 relative overflow-x-hidden">
      {/* Background paper texture */}
      <div className="fixed inset-0 paper-texture opacity-70 pointer-events-none" />

      {/* Top Floating Navigation / Utility Bar */}
      <div className="relative z-20 max-w-3xl mx-auto mb-5 flex items-center justify-between px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFE3CF] border border-[#DCBFA2] text-[#695037] text-xs font-medium font-sans-bengali">
            <HeartHandshake className="w-3.5 h-3.5 text-[#8C3A27]" />
            <span>চিঠি দিবস ২০২৬</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ambient Sound Button */}
          <button
            onClick={toggleAmbientSound}
            aria-label={isPlayingSound ? 'সুর বন্ধ করুন' : 'চিঠির সুর শুনুন'}
            title={isPlayingSound ? 'সুর বন্ধ করুন' : 'চিঠির সুর শুনুন'}
            className="p-2 rounded-xl bg-[#EFE4D0] hover:bg-[#E5D7BF] text-[#634F3D] border border-[#DAC9AF] transition-all cursor-pointer shadow-xs"
          >
            {isPlayingSound ? (
              <Volume2 className="w-4 h-4 text-[#8C3A27] animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Relock Button (Return to locked envelope) */}
          <button
            onClick={onRelock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFE4D0] hover:bg-[#E2D2B8] text-[#544131] border border-[#DAC9AF] text-xs font-medium transition-all cursor-pointer shadow-xs font-sans-bengali"
          >
            <Lock className="w-3.5 h-3.5 text-[#8C3A27]" />
            <span>লক করুন</span>
          </button>
        </div>
      </div>

      {/* Main Letter Card */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 max-w-3xl mx-auto"
      >
        <div className="bg-[#FFFDF9] rounded-2xl shadow-xl border border-[#E3D6BF] p-6 sm:p-12 relative overflow-hidden">
          
          {/* Subtle Top Decorative Postal Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8C3A27] via-[#C99E5C] to-[#8C3A27]" />

          {/* Loading Skeleton State */}
          <AnimatePresence>
            {isLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 animate-pulse py-4"
              >
                <div className="flex justify-between items-center pb-6 border-b border-[#EDE1CF]">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-[#EADDC9] rounded" />
                    <div className="h-3.5 w-24 bg-[#EADDC9] rounded" />
                  </div>
                  <div className="w-16 h-20 bg-[#EADDC9] rounded" />
                </div>

                <div className="space-y-3 pt-4">
                  <div className="h-6 w-48 bg-[#EADDC9] rounded" />
                  <div className="h-4 w-full bg-[#EADDC9]/80 rounded" />
                  <div className="h-4 w-11/12 bg-[#EADDC9]/80 rounded" />
                  <div className="h-4 w-full bg-[#EADDC9]/80 rounded" />
                  <div className="h-4 w-4/5 bg-[#EADDC9]/80 rounded" />
                </div>

                <div className="h-48 w-full bg-[#EADDC9]/50 rounded-xl" />
              </motion.div>
            ) : (
              <motion.div
                key="letter-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {/* Database Diagnostic Notice (Visible if Supabase returns query/RLS error) */}
                {dbError && (
                  <div className="mb-6 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold font-sans-bengali">Supabase সংযোগ সতর্কতা:</p>
                      <p className="font-mono text-[11px] text-amber-800 mt-0.5">{dbError}</p>
                      <p className="text-[11px] text-amber-700 mt-1 font-sans-bengali">
                        দয়া করে Supabase Dashboard-এ <code className="bg-amber-100 px-1 rounded">site_content</code> টেবিলের RLS SELECT পলিসি চেক করুন।
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Header (Date, Location, Postal Stamp & Postmark) */}
                <header className="flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-6 pb-7 border-b border-[#EBDCC7]">
                  {/* Date & Location */}
                  <div className="space-y-1.5 text-xs text-[#705E4D]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#8C3A27] shrink-0" />
                      <span className="font-medium text-[#423326] font-sans-bengali">
                        তারিখ: {content.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#8C3A27] shrink-0" />
                      <span className="font-sans-bengali">
                        স্থান: {content.location}
                      </span>
                    </div>
                    <div className="pt-1.5">
                      <span className="inline-block text-[10px] px-2.5 py-0.5 rounded bg-[#F4ECDC] text-[#785E42] border border-[#DFCDB1] font-vintage tracking-wider">
                        CHITHI DIBOSH • MEMORY CARD
                      </span>
                    </div>
                  </div>

                  {/* Stamp & Postmark Seals */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Postmark Circle */}
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-[#8C3A27]/60 flex items-center justify-center p-1 -rotate-6 select-none pointer-events-none">
                      <div className="w-full h-full rounded-full border border-[#8C3A27]/40 flex flex-col items-center justify-center text-center leading-tight text-[#8C3A27]">
                        <span className="text-[8px] font-vintage uppercase">পোস্টাল</span>
                        <span className="text-[10px] font-serif-bengali font-bold">চিঠি দিবস</span>
                        <span className="text-[8px] font-vintage">২০২৬</span>
                      </div>
                    </div>

                    {/* Postal Stamp */}
                    <div className="w-16 h-20 stamp-border bg-[#F5ECDB] rounded-xs p-1.5 flex flex-col items-center justify-between text-center shadow-xs select-none">
                      <div className="text-[8px] font-bold text-[#8C3A27] uppercase tracking-tight font-vintage">
                        BANGLADESH
                      </div>
                      <Stamp className="w-6 h-6 text-[#8C3A27]/85" strokeWidth={1.6} />
                      <div className="text-[9px] font-bold text-[#453629] font-vintage">
                        ৳ ৫.০০
                      </div>
                    </div>
                  </div>
                </header>

                {/* 2. Letter Body & Formatted Paragraphs */}
                <article className="pt-8 pb-8 space-y-6">
                  {/* Salutation */}
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold font-serif-bengali text-[#2C2117]">
                      {content.recipient}
                    </h2>
                  </div>

                  {/* Paragraphs with preserved line breaks & indentation */}
                  <div className="space-y-5 text-[#30261D] font-serif-bengali text-base sm:text-lg leading-relaxed sm:leading-loose text-justify">
                    {content.paragraphs.map((paragraph, index) => (
                      <p 
                        key={index} 
                        className="indent-6 sm:indent-8 whitespace-pre-line"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Sign-off & Sender */}
                  <div className="pt-6 flex flex-col items-end text-right font-serif-bengali">
                    <p className="text-sm sm:text-base text-[#614F3F] italic">
                      {content.signOff}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-[#2A1E14] mt-1">
                      {content.sender}
                    </p>
                    
                    {/* Wax Seal Symbol */}
                    <div className="mt-4 flex items-center gap-2 text-[#8C3A27]">
                      <div className="w-8 h-8 rounded-full bg-[#8C3A27] text-[#FAF5EC] flex items-center justify-center shadow-md border-2 border-[#6E2A1C]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </article>

                {/* 3. Image Section (Polaroid / Vintage Paper Clip Card) */}
                <section className="my-8 pt-8 border-t border-[#EDE1CF]">
                  <div className="max-w-md mx-auto">
                    <div className="relative bg-[#FFFFFF] p-3 sm:p-4 rounded-xl shadow-lg border border-[#DECDB3] rotate-[-0.8deg] hover:rotate-0 transition-transform duration-300">
                      
                      {/* Vintage Masking Tape Top Accent */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#E7DAC2]/90 border-x border-[#C2B295] shadow-2xs backdrop-blur-xs rotate-[1deg]" />

                      <div className="overflow-hidden rounded-lg bg-[#F2EDE2] aspect-[4/3] relative flex items-center justify-center">
                        {content.photoUrl && !imageError ? (
                          <>
                            {isImageLoading && (
                              <div className="absolute inset-0 bg-[#EFE7D8]/80 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-300">
                                <ImageIcon className="w-8 h-8 text-[#8C3A27]/40 animate-pulse" />
                              </div>
                            )}
                            <img
                              ref={imgRef}
                              key={content.photoUrl}
                              src={content.photoUrl}
                              alt="চিঠি দিবসের স্মৃতিময় ছবি"
                              onLoad={() => {
                                setIsImageLoading(false);
                                setImageError(false);
                              }}
                              onError={() => {
                                console.warn('[User Page] ⚠️ Image failed to load from URL:', content.photoUrl);
                                setImageError(true);
                                setIsImageLoading(false);
                              }}
                              className={`w-full h-full object-cover filter sepia-[0.12] contrast-[1.02] hover:scale-105 transition-all duration-500 ${
                                isImageLoading ? 'opacity-90 scale-98' : 'opacity-100 scale-100'
                              }`}
                              loading="eager"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#8C7A67] p-6 text-center bg-[#F7F2EA]">
                            <ImageIcon className="w-10 h-10 mb-2 opacity-50 text-[#8C3A27]" />
                            <span className="text-xs font-sans-bengali text-[#665342]">
                              চিঠির স্মৃতিময় আলোকচিত্র
                            </span>
                            {imageError && (
                              <button
                                onClick={() => {
                                  setImageError(false);
                                  setIsImageLoading(true);
                                }}
                                className="mt-2 text-[11px] text-[#8C3A27] underline hover:text-[#6E2A1C] font-sans-bengali cursor-pointer"
                              >
                                পুনরায় চেষ্টা করুন (Reload Image)
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Photo Caption */}
                      {content.photoCaption && (
                        <div className="pt-3 pb-1 text-center">
                          <p className="text-xs sm:text-sm font-serif-bengali text-[#5C4A3A] italic">
                            {content.photoCaption}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* 4. Opinion Box ("তোমার মতামত") */}
                <OpinionBox />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Footer Note */}
        <footer className="text-center text-xs text-[#8C7A68] py-8 space-y-1 font-sans-bengali">
          <p>চিঠি দিবস উপলক্ষে তৈরি করা একটি ব্যক্তিগত স্মৃতিকথা</p>
          <p className="text-[11px] text-[#A69584]">
            হাতে লেখা চিঠির মমতা বেঁচে থাকুক প্রজন্ম থেকে প্রজন্মে
          </p>
        </footer>
      </motion.main>
    </div>
  );
};
