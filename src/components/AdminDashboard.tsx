import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut,
  FileText,
  MessageSquare,
  Image as ImageIcon,
  Save,
  Trash2,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Upload,
  RefreshCw,
  Eye,
  Plus,
  Minus,
  Sparkles,
  Search,
  Check,
  Calendar,
  MapPin,
  User,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { signOut, getCurrentUser } from '../lib/auth';
import { LETTER_CONTENT } from '../data/letterContent';
import { LetterData, OpinionRecord } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
  onViewLetter: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onViewLetter,
}) => {
  const [activeTab, setActiveTab] = useState<'letter' | 'image' | 'opinions'>('letter');
  const [letterData, setLetterData] = useState<LetterData>(LETTER_CONTENT);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image manager state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Opinions state
  const [opinions, setOpinions] = useState<OpinionRecord[]>([]);
  const [isLoadingOpinions, setIsLoadingOpinions] = useState(false);
  const [opinionSearch, setOpinionSearch] = useState('');
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Global Toast Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Verify Admin Session on mount
  useEffect(() => {
    async function verifyAuth() {
      if (isSupabaseConfigured) {
        const user = await getCurrentUser();
        if (!user) {
          onLogout();
        }
      }
    }
    verifyAuth();
  }, [onLogout]);

  // 1. Fetch current letter data from Supabase
  const loadLetterContent = async () => {
    setIsLoadingContent(true);
    if (!supabase) {
      console.log('[Admin] Supabase not configured in current environment.');
      setIsLoadingContent(false);
      return;
    }

    try {
      console.log('[Admin] 📡 Loading letter content from site_content table...');
      
      let fetchedData: any = null;
      let queryError: any = null;

      // Strategy 1: Try order by updated_at descending
      const qUpdated = await supabase
        .from('site_content')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!qUpdated.error && qUpdated.data && qUpdated.data.length > 0) {
        fetchedData = qUpdated.data[0];
      } else if (qUpdated.error) {
        // Strategy 2: Try order by created_at descending
        const qCreated = await supabase
          .from('site_content')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!qCreated.error && qCreated.data && qCreated.data.length > 0) {
          fetchedData = qCreated.data[0];
        } else {
          // Strategy 3: Select first row
          const qFallback = await supabase
            .from('site_content')
            .select('*')
            .limit(1);

          if (!qFallback.error && qFallback.data && qFallback.data.length > 0) {
            fetchedData = qFallback.data[0];
          } else {
            queryError = qUpdated.error || qCreated.error || qFallback.error;
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
          console.info('[Admin] ℹ️ site_content table is not yet created in Supabase database.');
        } else {
          console.warn('[Admin] ⚠️ Supabase fetch notice:', queryError.message || String(queryError));
          showToast('error', `ডেটাবেজ থেকে লোড করতে সমস্যা: ${queryError.message}`);
        }
      } else if (fetchedData) {
        console.log('[Admin] ✅ Supabase site_content fetch result found');
        let parsed: any = fetchedData.letter_content;
        if (typeof fetchedData.letter_content === 'string') {
          try {
            parsed = JSON.parse(fetchedData.letter_content);
          } catch {
            const paras = fetchedData.letter_content
              .split(/\n\s*\n/)
              .map((p: string) => p.trim())
              .filter(Boolean);
            parsed = {
              paragraphs: paras.length > 0 ? paras : [fetchedData.letter_content],
            };
          }
        }

        const resolvedPhotoUrl = fetchedData.image_url || parsed?.photoUrl || letterData.photoUrl;
        console.log('[Admin] Resolved photoUrl from DB:', resolvedPhotoUrl);
        setLetterData((prev) => ({
          ...prev,
          ...(parsed || {}),
          photoUrl: resolvedPhotoUrl,
        }));
      } else {
        console.log('[Admin] ℹ️ site_content table is currently empty in Supabase.');
      }
    } catch (err: any) {
      console.error('[Admin] ❌ Exception in loadLetterContent:', err);
      showToast('error', `সংযোগ ত্রুটি: ${err?.message || err}`);
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    loadLetterContent();
  }, []);

  // 2. Fetch opinions
  const loadOpinions = async () => {
    setIsLoadingOpinions(true);
    if (!supabase) {
      setOpinions([]);
      setIsLoadingOpinions(false);
      return;
    }

    try {
      console.log('[Admin] 📡 Fetching opinions from Supabase...');
      const { data, error } = await supabase
        .from('opinions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const isTableMissing = 
          error.code === 'PGRST205' || 
          error.code === '42P01' || 
          (error.message || '').includes('schema cache') ||
          (error.message || '').includes('Could not find the table');
        
        if (isTableMissing) {
          console.info('[Admin] ℹ️ opinions table is not yet created in Supabase database.');
          setOpinions([]);
        } else {
          console.warn('[Admin] Notice fetching opinions:', error.message);
          showToast('error', `মতামত লোড করতে ব্যর্থ: ${error.message}`);
        }
      } else if (data) {
        console.log('[Admin] ✅ Received opinions:', data.length);
        setOpinions(data);
      }
    } catch (err: any) {
      console.error('[Admin] Exception fetching opinions:', err);
      showToast('error', `মতামত সংযোগ ত্রুটি: ${err?.message || err}`);
    } finally {
      setIsLoadingOpinions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'opinions') {
      loadOpinions();

      // Subscribe to realtime opinion updates
      let channel: any = null;
      if (supabase) {
        channel = supabase
          .channel('admin_opinions_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'opinions' },
            () => {
              console.log('[Admin] 🔔 New opinion update received, reloading...');
              loadOpinions();
            }
          )
          .subscribe();
      }

      return () => {
        if (supabase && channel) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [activeTab]);

  // Show status notification
  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5500);
  };

  // 1. SAVE LETTER HANDLER
  const handleSaveLetter = async () => {
    setIsSaving(true);
    console.log('[Admin] 💾 Initiating Save Letter operation to Supabase...');

    if (!supabase) {
      setIsSaving(false);
      showToast('error', 'Supabase ডেটাবেজ কনফিগার করা নেই। VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY প্রদান করুন।');
      return;
    }

    try {
      console.log('[Admin] 🔍 Querying existing rows in site_content table...');
      const { data: existingRows, error: fetchErr } = await supabase
        .from('site_content')
        .select('id')
        .limit(10);

      if (fetchErr) {
        console.error('[Admin] ❌ Error checking site_content table:', fetchErr);
        throw new Error(`টেবিল অ্যাক্সেস ব্যর্থ (${fetchErr.code}): ${fetchErr.message}`);
      }

      const payloadWithTimestamp: Record<string, any> = {
        letter_content: JSON.stringify(letterData),
        image_url: letterData.photoUrl || '',
        updated_at: new Date().toISOString(),
      };

      const payloadWithoutTimestamp: Record<string, any> = {
        letter_content: JSON.stringify(letterData),
        image_url: letterData.photoUrl || '',
      };

      if (existingRows && existingRows.length > 0) {
        console.log(`[Admin] 🔄 Updating ${existingRows.length} existing row(s) in site_content...`);
        for (const row of existingRows) {
          let { error: updateError } = await supabase
            .from('site_content')
            .update(payloadWithTimestamp)
            .eq('id', row.id);

          // Retry without updated_at if column does not exist
          if (updateError && updateError.code === '42703') {
            const retryRes = await supabase
              .from('site_content')
              .update(payloadWithoutTimestamp)
              .eq('id', row.id);
            updateError = retryRes.error;
          }

          if (updateError) {
            console.error('[Admin] ❌ Update error for row id', row.id, updateError);
            throw updateError;
          }
        }
        console.log('[Admin] ✅ Admin letter update result: SUCCESS (Updated existing row(s))');
      } else {
        console.log('[Admin] ➕ No existing rows found. Inserting initial row into site_content...');
        let { error: insertError } = await supabase
          .from('site_content')
          .insert([payloadWithTimestamp]);

        // Retry without updated_at if column does not exist
        if (insertError && insertError.code === '42703') {
          const retryInsert = await supabase
            .from('site_content')
            .insert([payloadWithoutTimestamp]);
          insertError = retryInsert.error;
        }

        if (insertError) {
          console.error('[Admin] ❌ Insert error:', insertError);
          throw insertError;
        }
        console.log('[Admin] ✅ Admin letter update result: SUCCESS (Inserted new row)');
      }

      showToast('success', 'চিঠির বিষয়বস্তু Supabase ডেটাবেজে সফলভাবে স্থায়ী সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      console.error('[Admin] ❌ Save letter failed:', err);
      showToast('error', `সংরক্ষণ ব্যর্থ হয়েছে: ${err?.message || 'সমস্যা দেখা দিয়েছে'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. IMAGE UPLOAD & REPLACE HANDLER
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadAndReplaceImage = async () => {
    if (!selectedFile && !letterData.photoUrl) {
      showToast('error', 'দয়া করে একটি নতুন ছবি নির্বাচন করুন অথবা একটি ইমেজ লিংক দিন');
      return;
    }

    if (!supabase) {
      showToast('error', 'Supabase Storage কনফিগার করা নেই। VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY প্রয়োজন।');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    let targetPhotoUrl = letterData.photoUrl;

    if (selectedFile) {
      try {
        setUploadProgress(40);
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const sanitizedExt = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fileExt) ? fileExt : 'jpg';
        const fileName = `letter_photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${sanitizedExt}`;
        const filePath = `uploads/${fileName}`;

        console.log(`[Admin] 📤 Uploading image file "${fileName}" to Supabase Storage bucket "letter-images"...`);

        // 1. Upload to Supabase Storage bucket "letter-images"
        const { error: uploadError } = await supabase.storage
          .from('letter-images')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: selectedFile.type || `image/${sanitizedExt}`,
          });

        if (uploadError) {
          console.error('[Admin] ❌ Supabase Storage upload error:', uploadError);
          throw new Error(`Storage আপলোড ব্যর্থ (${uploadError.message})। Supabase Storage bucket "letter-images" এবং RLS পারমিশন চেক করুন।`);
        }

        console.log('[Admin] ✅ Admin image upload result: SUCCESS (Uploaded to storage)');
        setUploadProgress(70);

        // 2. Generate correct permanent public URL from Supabase Storage
        const { data: publicUrlData } = supabase.storage
          .from('letter-images')
          .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error('Public URL তৈরি করা যায়নি। Storage bucket "letter-images"-এর Public toggle চেক করুন।');
        }

        targetPhotoUrl = publicUrlData.publicUrl;
        console.log('[Admin] 🖼️ Final permanent image_url from Supabase Storage:', targetPhotoUrl);
      } catch (uploadErr: any) {
        console.error('[Admin] ❌ Upload to storage failed:', uploadErr);
        setIsUploading(false);
        setUploadProgress(null);
        showToast(
          'error',
          `ছবি আপলোড ব্যর্থ: ${uploadErr?.message || 'Storage বাকেটের RLS পারমিশন চেক করুন'}`
        );
        return;
      }
    }

    setUploadProgress(85);

    try {
      const updatedLetter = { ...letterData, photoUrl: targetPhotoUrl };

      // 3. Save into site_content.image_url database field
      console.log('[Admin] 💾 Saving image_url to site_content table...');
      const { data: existingRows, error: fetchError } = await supabase
        .from('site_content')
        .select('id')
        .limit(10);

      if (fetchError) {
        console.error('[Admin] ❌ Error checking site_content for image update:', fetchError);
        throw fetchError;
      }

      const payloadWithTimestamp = {
        image_url: targetPhotoUrl,
        letter_content: JSON.stringify(updatedLetter),
        updated_at: new Date().toISOString(),
      };

      const payloadWithoutTimestamp = {
        image_url: targetPhotoUrl,
        letter_content: JSON.stringify(updatedLetter),
      };

      if (existingRows && existingRows.length > 0) {
        for (const row of existingRows) {
          let { error: updateError } = await supabase
            .from('site_content')
            .update(payloadWithTimestamp)
            .eq('id', row.id);

          if (updateError && updateError.code === '42703') {
            const retryRes = await supabase
              .from('site_content')
              .update(payloadWithoutTimestamp)
              .eq('id', row.id);
            updateError = retryRes.error;
          }

          if (updateError) throw updateError;
        }
        console.log('[Admin] ✅ Image URL updated in site_content table');
      } else {
        let { error: insertError } = await supabase
          .from('site_content')
          .insert([payloadWithTimestamp]);

        if (insertError && insertError.code === '42703') {
          const retryInsert = await supabase
            .from('site_content')
            .insert([payloadWithoutTimestamp]);
          insertError = retryInsert.error;
        }

        if (insertError) throw insertError;
        console.log('[Admin] ✅ Image URL inserted in new site_content row');
      }

      setUploadProgress(100);
      setLetterData(updatedLetter);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      showToast('success', 'নতুন ছবি Supabase Storage-এ স্থায়ীভাবে আপলোড ও মূল ওয়েবসাইটে সংরক্ষিত হয়েছে!');
    } catch (dbErr: any) {
      console.error('[Admin] ❌ Database update failed:', dbErr);
      showToast(
        'error',
        `ডেটাবেজে ছবি সংরক্ষণ ব্যর্থ: ${dbErr?.message || 'site_content টেবিলের পারমিশন চেক করুন'}`
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // 3. DELETE OPINION HANDLER
  const confirmDeleteOpinion = async () => {
    if (!deleteModalId) return;

    if (!supabase) {
      showToast('error', 'Supabase সংযোগ নেই');
      setDeleteModalId(null);
      return;
    }

    setIsDeleting(true);
    const targetId = deleteModalId;

    try {
      const { error } = await supabase
        .from('opinions')
        .delete()
        .eq('id', targetId);

      if (error) throw error;

      setOpinions((prev) => prev.filter((op) => op.id !== targetId));
      showToast('success', 'মতামতটি সফলভাবে মুছে ফেলা হয়েছে');
    } catch (err: any) {
      showToast('error', `মতামত মুছতে ব্যর্থ হয়েছে: ${err?.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteModalId(null);
    }
  };

  // 4. PARAGRAPH HELPERS
  const handleAddParagraph = () => {
    setLetterData((prev) => ({
      ...prev,
      paragraphs: [...prev.paragraphs, 'নতুন অনুচ্ছেদের লেখা এখানে লিখুন...'],
    }));
  };

  const handleRemoveParagraph = (index: number) => {
    if (letterData.paragraphs.length <= 1) return;
    setLetterData((prev) => ({
      ...prev,
      paragraphs: prev.paragraphs.filter((_, idx) => idx !== index),
    }));
  };

  const handleParagraphTextChange = (index: number, text: string) => {
    const updated = [...letterData.paragraphs];
    updated[index] = text;
    setLetterData((prev) => ({ ...prev, paragraphs: updated }));
  };

  // Filtered opinions
  const filteredOpinions = opinions.filter((op) =>
    op.opinion_text.toLowerCase().includes(opinionSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-[#2C2723] pb-20 font-sans-bengali">
      {/* Sticky Admin Header */}
      <header className="sticky top-0 z-30 bg-[#FAF7F0] border-b border-[#DFCDB3] px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2C2117] text-[#FDF9EE] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#D4A76A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold font-serif-bengali text-[#261E16]">
                  চিঠি দিবস — অ্যাডমিন প্যানেল
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFE3CF] text-[#695037] border border-[#DCBFA2]">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-[#7A6754] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>{isSupabaseConfigured ? 'Supabase Auth Verified' : 'Demo Mode'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Live Letter Button */}
            <button
              onClick={onViewLetter}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFE3CF] hover:bg-[#E2D2B9] text-[#4F3C2C] text-xs font-semibold border border-[#D5C2A4] transition-all cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4 text-[#8C3A27]" />
              <span className="hidden sm:inline">চিঠি দেখুন</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={async () => {
                await signOut();
                onLogout();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8C3A27] hover:bg-[#732B1B] text-[#FDF9EE] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
        
        {/* Global Toast Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-md ${
                notification.type === 'success'
                  ? 'bg-[#EBF7EB] border-[#BCE4BC] text-[#1E4E20]'
                  : 'bg-[#FDF0EF] border-[#F5C2C0] text-[#7A1F1D]'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-[#2E7D32] shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#C62828] shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-semibold">
                {notification.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#DFCDB3] pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('letter')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'letter'
                ? 'bg-[#2C2117] text-[#FAF6EE] shadow-sm'
                : 'bg-[#FAF7F0] text-[#695441] hover:bg-[#EDE1CD] border border-[#DECDB3]'
            }`}
          >
            <FileText className="w-4 h-4 text-[#D4A76A]" />
            <span>১. Letter Editor (চিঠি এডিটর)</span>
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'image'
                ? 'bg-[#2C2117] text-[#FAF6EE] shadow-sm'
                : 'bg-[#FAF7F0] text-[#695441] hover:bg-[#EDE1CD] border border-[#DECDB3]'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#D4A76A]" />
            <span>২. Image Manager (ছবি আপলোড ও পরিবর্তন)</span>
          </button>

          <button
            onClick={() => setActiveTab('opinions')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'opinions'
                ? 'bg-[#2C2117] text-[#FAF6EE] shadow-sm'
                : 'bg-[#FAF7F0] text-[#695441] hover:bg-[#EDE1CD] border border-[#DECDB3]'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#D4A76A]" />
            <span>৩. Opinions (মতামত ও প্রতিক্রিয়া)</span>
            <span className="ml-1 px-2 py-0.2 rounded-full text-[10px] bg-[#8C3A27] text-white">
              {opinions.length}
            </span>
          </button>
        </div>

        {/* ========================================================
            SECTION 1: LETTER EDITOR
        ======================================================== */}
        {activeTab === 'letter' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[#FAF7F0] rounded-2xl border border-[#DFCDB3] p-5 sm:p-8 shadow-sm space-y-6">
              
              {/* Header & Save Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8DAC5]">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-serif-bengali text-[#261E16]">
                    চিঠির বিষয়বস্তু সম্পাদন (Letter Editor)
                  </h2>
                  <p className="text-xs text-[#7A6755] mt-0.5">
                    এখানে করা সমস্ত পরিবর্তন Supabase ডেটাবেজে সংরক্ষিত হবে এবং মূল পেজে স্বয়ংক্রিয়ভাবে দেখাবে।
                  </p>
                </div>

                <button
                  onClick={handleSaveLetter}
                  disabled={isSaving || isLoadingContent}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#8C3A27] hover:bg-[#732B1B] text-[#FAF6EE] text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-70"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Letter (সংরক্ষণ করুন)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Meta Inputs (Recipient, Date, Location, etc.) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#544333] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#8C3A27]" />
                    <span>প্রাপকের সম্বোধন (Recipient)</span>
                  </label>
                  <input
                    type="text"
                    value={letterData.recipient}
                    onChange={(e) => setLetterData({ ...letterData, recipient: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#DAC7AB] text-xs sm:text-sm text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#544333] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#8C3A27]" />
                    <span>চিঠির তারিখ (Date)</span>
                  </label>
                  <input
                    type="text"
                    value={letterData.date}
                    onChange={(e) => setLetterData({ ...letterData, date: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#DAC7AB] text-xs sm:text-sm text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#544333] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8C3A27]" />
                    <span>স্থান (Location)</span>
                  </label>
                  <input
                    type="text"
                    value={letterData.location}
                    onChange={(e) => setLetterData({ ...letterData, location: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#DAC7AB] text-xs sm:text-sm text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#544333]">
                    প্রেরকের নাম (Sender Name)
                  </label>
                  <input
                    type="text"
                    value={letterData.sender}
                    onChange={(e) => setLetterData({ ...letterData, sender: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#DAC7AB] text-xs sm:text-sm text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#544333]">
                    সমাপ্তি বার্তা (Sign-off)
                  </label>
                  <input
                    type="text"
                    value={letterData.signOff}
                    onChange={(e) => setLetterData({ ...letterData, signOff: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#DAC7AB] text-xs sm:text-sm text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#544333]">
                    চিঠির ফটো ক্যাপশন (Photo Caption)
                  </label>
                  <input
                    type="text"
                    value={letterData.photoCaption}
                    onChange={(e) => setLetterData({ ...letterData, photoCaption: e.target.value })}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#DAC7AB] text-xs sm:text-sm text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                  />
                </div>
              </div>

              {/* Large Paragraphs Section with Preserved Formatting */}
              <div className="space-y-4 pt-5 border-t border-[#E8DAC5]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-serif-bengali text-[#261E16]">
                      চিঠির মূল অনুচ্ছেদসমূহ (Letter Body Paragraphs)
                    </h3>
                    <p className="text-xs text-[#806B56]">
                      প্রতিটি অনুচ্ছেদের ভেতর লাইন ব্রেক ও অনুভূতির বিন্যাস সম্পূর্ণ অক্ষুণ্ন থাকবে
                    </p>
                  </div>

                  <button
                    onClick={handleAddParagraph}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EFE3CF] hover:bg-[#E4D5BC] text-[#8C3A27] text-xs font-bold border border-[#DFCBB0] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>নতুন প্যারাগ্রাফ যোগ করুন</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {letterData.paragraphs.map((para, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-xl border border-[#DFCBB0] space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs text-[#7A6754]">
                        <span className="font-bold font-serif-bengali">
                          অনুচ্ছেদ #{idx + 1}
                        </span>
                        {letterData.paragraphs.length > 1 && (
                          <button
                            onClick={() => handleRemoveParagraph(idx)}
                            className="text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Minus className="w-3.5 h-3.5" />
                            <span>মুছুন</span>
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={4}
                        value={para}
                        onChange={(e) => handleParagraphTextChange(idx, e.target.value)}
                        placeholder="এখানে চিঠির অনুচ্ছেদ লিখুন..."
                        className="w-full p-3 bg-[#FAF7F0] rounded-lg border border-[#E3D5C0] text-sm text-[#281F17] focus:outline-none focus:border-[#8C3A27] focus:ring-1 focus:ring-[#8C3A27]/20 leading-relaxed resize-y font-serif-bengali"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Save Action */}
              <div className="pt-4 border-t border-[#E8DAC5] flex justify-end">
                <button
                  onClick={handleSaveLetter}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#8C3A27] hover:bg-[#732B1B] text-[#FAF6EE] text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Letter (সংরক্ষণ করুন)</span>
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {/* ========================================================
            SECTION 2: IMAGE MANAGER
        ======================================================== */}
        {activeTab === 'image' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[#FAF7F0] rounded-2xl border border-[#DFCDB3] p-5 sm:p-8 shadow-sm space-y-6">
              
              <div className="pb-4 border-b border-[#E8DAC5]">
                <h2 className="text-lg sm:text-xl font-bold font-serif-bengali text-[#261E16]">
                  ইমেজ ম্যানেজার (Image Manager)
                </h2>
                <p className="text-xs text-[#7A6755] mt-0.5">
                  চিঠির নিচের স্মৃতিময় ছবি পরিবর্তন করুন। ছবি সরাসরি Supabase Storage বাকেট (<code>letter-images</code>)-এ আপলোড হবে এবং মূল ওয়েবসাইটে তাৎক্ষণিকভাবে আপডেট হবে।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Current / Preview Image Card */}
                <div className="md:col-span-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#735F4C]">
                    {previewUrl ? 'নতুন নির্বাচিত ছবির প্রিভিউ' : 'বর্তমানে ওয়েবসাইটে প্রদর্শিত ছবি'}
                  </h3>

                  <div className="relative bg-white p-3 rounded-2xl border border-[#DFCBB0] shadow-md overflow-hidden">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F2EDE2] flex items-center justify-center">
                      <img
                        src={previewUrl || letterData.photoUrl}
                        alt="Letter photo"
                        className="w-full h-full object-cover filter sepia-[0.1] contrast-[1.02]"
                      />
                    </div>

                    <div className="pt-2 text-center">
                      <p className="text-xs text-[#6B5745] font-serif-bengali italic">
                        ক্যাপশন: {letterData.photoCaption || 'চিঠির স্মৃতিময় আলোকচিত্র'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload & Replace Controls */}
                <div className="md:col-span-7 space-y-5 bg-white p-5 sm:p-6 rounded-2xl border border-[#DFCBB0] shadow-2xs">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#45372B]">
                      কম্পিউটার বা মোবাইল থেকে নতুন ছবি নির্বাচন করুন
                    </label>

                    {/* Drag & Select Box */}
                    <label className="border-2 border-dashed border-[#D5C2A4] hover:border-[#8C3A27] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#FAF7F0] hover:bg-[#F5ECE0]">
                      <Upload className="w-8 h-8 text-[#8C3A27] mb-2" />
                      <span className="text-xs sm:text-sm font-semibold text-[#3D3025]">
                        {selectedFile ? selectedFile.name : 'ছবি সিলেক্ট করতে ক্লিক করুন'}
                      </span>
                      <span className="text-[11px] text-[#8C765D] mt-1">
                        PNG, JPG, JPEG অথবা WEBP ফরম্যাট
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Upload Progress Bar */}
                  {uploadProgress !== null && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-[#6E5540]">
                        <span>আপলোড হচ্ছে...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-[#EFE3CF] h-2 rounded-full overflow-hidden">
                        <motion.div
                          className="bg-[#8C3A27] h-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Direct Image URL input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#544333]">
                      অথবা সরাসরি ইমেজ লিংক (Direct Image URL) দিন:
                    </label>
                    <input
                      type="url"
                      value={letterData.photoUrl}
                      onChange={(e) => setLetterData({ ...letterData, photoUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-2.5 bg-[#FAF7F0] rounded-xl border border-[#DAC7AB] text-xs text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                    />
                  </div>

                  {/* Replace Image Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleUploadAndReplaceImage}
                      disabled={isUploading || (!selectedFile && !letterData.photoUrl)}
                      className="w-full py-3 px-5 rounded-xl bg-[#2C2117] hover:bg-[#1C140D] text-[#FAF6EE] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isUploading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>Supabase Storage-এ আপলোড ও আপডেট হচ্ছে...</span>
                        </div>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-[#D4A76A]" />
                          <span>Replace Image (ছবি প্রতিস্থাপন করুন)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* ========================================================
            SECTION 3: OPINIONS MANAGER
        ======================================================== */}
        {activeTab === 'opinions' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="bg-[#FAF7F0] rounded-2xl border border-[#DFCDB3] p-5 sm:p-8 shadow-sm space-y-5">
              
              {/* Opinions Header & Refresh */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DAC5]">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-serif-bengali text-[#261E16]">
                    দর্শকদের মতামত তালিকা ({opinions.length})
                  </h2>
                  <p className="text-xs text-[#7A6755] mt-0.5">
                    সাধারণ ব্যবহারকারী শুধুমাত্র মতামত দিতে পারে, কিন্তু দেখতে পারে না। কেবল আপনি (Admin) সকল মতামত দেখতে ও নিয়ন্ত্রণ করতে পারবেন।
                  </p>
                </div>

                <button
                  onClick={loadOpinions}
                  disabled={isLoadingOpinions}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EFE3CF] hover:bg-[#E4D5BC] text-[#4F3C2C] text-xs font-semibold border border-[#D5C2A4] transition-all cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOpinions ? 'animate-spin' : ''}`} />
                  <span>তালিক রিফ্রেশ করুন</span>
                </button>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#998672]" />
                <input
                  type="text"
                  value={opinionSearch}
                  onChange={(e) => setOpinionSearch(e.target.value)}
                  placeholder="মতামতের ভেতরে খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#DAC7AB] text-xs sm:text-sm text-[#261E16] focus:outline-none focus:border-[#8C3A27]"
                />
              </div>

              {/* Opinions List */}
              {isLoadingOpinions ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-7 h-7 border-2 border-[#8C3A27] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-[#806D5B]">মতামত লোড হচ্ছে...</p>
                </div>
              ) : filteredOpinions.length === 0 ? (
                <div className="py-12 text-center text-[#8C765D] space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto text-[#C2B097] opacity-60" />
                  <p className="text-sm font-semibold">কোনো মতামত পাওয়া যায়নি</p>
                  <p className="text-xs text-[#9E8A73]">
                    {opinionSearch ? 'আপনার খোঁজা শব্দের সাথে কোনো মতামত মেলেনি' : 'এখনো পর্যন্ত কোনো পাঠক মতামত পাঠায়নি'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOpinions.map((op) => (
                    <div
                      key={op.id}
                      className="p-4 sm:p-5 bg-white rounded-xl border border-[#DFCBB0] shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 w-full">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8C765D]">
                          <span className="font-mono text-[10px] bg-[#F4ECDC] px-2 py-0.5 rounded text-[#6E5743] border border-[#E0CFB5]">
                            ID: {op.id.slice(0, 8)}
                          </span>
                          <span className="flex items-center gap-1 text-[#6E5946]">
                            <Clock className="w-3 h-3 text-[#8C3A27]" />
                            {new Date(op.created_at).toLocaleString('bn-BD', {
                              dateStyle: 'full',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#261E16] font-medium leading-relaxed whitespace-pre-wrap pt-1">
                          {op.opinion_text}
                        </p>
                      </div>

                      <button
                        onClick={() => setDeleteModalId(op.id)}
                        className="self-end sm:self-center inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 text-xs font-semibold transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>মুছুন</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        )}

      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF7F0] rounded-2xl border border-[#DFCDB3] p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold font-serif-bengali text-[#261E16]">
                  মতামতটি মুছে ফেলতে চান?
                </h3>
                <p className="text-xs text-[#786452]">
                  এই অ্যাকশনটি অপরিবর্তনীয়। ডেটাবেজ থেকে এই মতামতটি চিরতরে মুছে যাবে।
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setDeleteModalId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-[#EFE3CF] hover:bg-[#E2D2B8] text-[#544131] text-xs font-semibold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  onClick={confirmDeleteOpinion}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
