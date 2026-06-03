/**
 * Munaxa Coming Soon Landing Page
 * 
 * A premium, bilingual (EN/AR) coming soon page for Munaxa - The School Operating System
 * 
 * Features:
 * - Pixel-perfect replication of the original design
 * - Framer Motion entrance animations
 * - Email capture with loading/success/error states
 * - Bilingual support with RTL layout
 * - Responsive mobile-first design
 * - Ambient animated background with gradient blobs
 * 
 * Usage: Drop this file into your Next.js app/pages directory
 * Dependencies: tailwindcss, framer-motion, lucide-react
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Globe, Mail } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type Language = 'en' | 'ar';

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations: Translations = {
  launchingSoon: {
    en: 'Launching soon',
    ar: 'قريبًا',
  },
  eyebrow: {
    en: 'The School Operating System · 2026',
    ar: 'نظام تشغيل المدارس · ٢٠٢٦',
  },
  headlinePart1: {
    en: 'The operating system for',
    ar: 'نظام التشغيل',
  },
  headlinePart2: {
    en: 'modern schools.',
    ar: 'للمدارس الحديثة.',
  },
  lead: {
    en: 'Munaxa brings admissions, attendance, finance, scheduling and parent communication into one calm platform — purpose-built for schools in Jordan. The school management you run on; your classroom tools stay where they are.',
    ar: 'تجمع مُناخة القبول والحضور والشؤون المالية والجدولة وتواصل أولياء الأمور في منصة واحدة هادئة — مصمّمة خصيصًا لمدارس الأردن. منظومة إدارة مدرستك، بينما تبقى أدوات الصف كما هي.',
  },
  notifyLabel: {
    en: 'Be first to know when we launch',
    ar: 'كن أول من يعلم عند الإطلاق',
  },
  emailPlaceholder: {
    en: 'you@domain.com',
    ar: 'بريدك الإلكتروني',
  },
  submitButton: {
    en: 'Notify me',
    ar: 'أعلِمني',
  },
  submitting: {
    en: 'Submitting...',
    ar: 'جاري الإرسال...',
  },
  successMessage: {
    en: "You're on the list. We'll be in touch soon.",
    ar: 'تم تسجيلك في القائمة. سنتواصل معك قريبًا.',
  },
  emailError: {
    en: 'Please enter a valid email address',
    ar: 'الرجاء إدخال بريد إلكتروني صحيح',
  },
  pillarAdmissions: {
    en: 'Admissions & records',
    ar: 'القبول والسجلات',
  },
  pillarAttendance: {
    en: 'Attendance',
    ar: 'الحضور والغياب',
  },
  pillarFinance: {
    en: 'School finance',
    ar: 'الشؤون المالية',
  },
  pillarScheduling: {
    en: 'Scheduling',
    ar: 'الجدولة',
  },
  pillarParentComm: {
    en: 'Parent communication',
    ar: 'تواصل أولياء الأمور',
  },
  pillarReporting: {
    en: 'Reporting',
    ar: 'التقارير',
  },
  mobileApps: {
    en: 'Plus mobile apps for parents, students and teachers — arriving at launch.',
    ar: 'بالإضافة إلى تطبيقات للهواتف لأولياء الأمور والطلاب والمعلمين — عند الإطلاق.',
  },
  chipNationalId: {
    en: 'National ID',
    ar: 'الرقم الوطني',
  },
  chipRaqamWatani: {
    en: 'Raqam Watani',
    ar: 'الرقم الوطني',
  },
  chipMoE: {
    en: 'MoE student number',
    ar: 'الرقم الوزاري للطالب',
  },
  chipCliQ: {
    en: 'CliQ payments',
    ar: 'مدفوعات CliQ',
  },
  connectsTo: {
    en: 'Connects to',
    ar: 'يتكامل مع',
  },
  footerCopyright: {
    en: '© 2026 Munaxa · Jordan',
    ar: '© ٢٠٢٦ مُناخة · الأردن',
  },
  earlyAccessLabel: {
    en: 'Early-access schools:',
    ar: 'للمدارس الراغبة بالوصول المبكر:',
  },
  contactEmail: {
    en: 'info@munaxa.com',
    ar: 'info@munaxa.com',
  },
};

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const fadeInUpDelayed = (delay: number) => ({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MunaxaComingSoon() {
  const [lang, setLang] = useState<Language>('en');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('munaxa_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ar')) {
      setLang(savedLang);
    }
  }, []);

  // Save language preference when changed
  useEffect(() => {
    localStorage.setItem('munaxa_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' ? 'مُناخة — قريبًا' : 'Munaxa — Launching soon';
  }, [lang]);

  const t = (key: keyof Translations) => translations[key][lang];

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !validateEmail(email)) {
      setError(lang === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call with 1 second delay
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // In production, replace this with actual Supabase call:
      // const { data, error } = await supabase
      //   .from('early_access')
      //   .insert([{ email: email.trim() }]);
      // if (error) throw error;

      console.log('Email submitted:', email.trim());
      setIsSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      setError(lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى لاحقًا.' : 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRTL = lang === 'ar';

  return (
    <div className={`relative min-h-screen overflow-hidden ${isRTL ? 'font-arabic' : 'font-sans'}`}>
      {/* ==========================================================================
          AMBIENT BACKGROUND LAYERS
          ========================================================================== */}
      <BackgroundEffects />

      {/* ==========================================================================
          MAIN CONTAINER
          ========================================================================== */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col px-[clamp(22px,5vw,56px)] py-[clamp(24px,4vh,40px)]">
          
          {/* ======================================================================
              TOPBAR - Logo, Status Pill, Language Toggle
              ====================================================================== */}
          <motion.header
            variants={fadeInUpDelayed(0.05)}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-between"
          >
            {/* Logo */}
            <a href="#" className="group inline-flex items-center gap-3" aria-label="Munaxa">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-gradient-to-br from-[#7A3FFF] to-[#B97BFF] text-white shadow-lg shadow-purple-500/25 transition-transform group-hover:scale-105">
                <span className="text-xl font-bold">M</span>
              </div>
              <span className="font-display text-[21px] font-semibold tracking-tight text-white">
                munaxa
                <span className="ml-0.5 mt-[0.15em] inline-block align-top text-[0.42em] font-mono font-medium text-[#8B83A8]">
                  ™
                </span>
              </span>
            </a>

            {/* Right side: Status + Language */}
            <div className="flex items-center gap-4">
              {/* Status Pill */}
              <span className="inline-flex items-center gap-2.5 rounded-full bg-[rgba(77,244,225,0.18)] px-[15px] py-[7px] text-[11.5px] font-mono font-medium uppercase tracking-[0.16em] text-[#4DF4E1] ring-1 ring-[rgba(77,244,225,0.3)]">
                <span className="relative flex h-[7px] w-[7px]">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4DF4E1] opacity-75"></span>
                  <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[#4DF4E1]"></span>
                </span>
                <span className="hidden sm:inline">{t('launchingSoon')}</span>
                <span className="sm:hidden">Soon</span>
              </span>

              {/* Language Toggle */}
              <div
                role="group"
                aria-label="Language"
                className="inline-flex rounded-full bg-white/5 p-1 ring-1 ring-white/10"
              >
                <button
                  onClick={() => setLang('en')}
                  className={`rounded-full px-[15px] py-[7px] text-[12px] font-mono font-medium tracking-widest transition-all ${
                    lang === 'en'
                      ? 'bg-gradient-to-r from-[#7A3FFF] via-[#B97BFF] to-[#FF8E6E] text-white shadow-lg shadow-purple-500/25'
                      : 'text-[#B5ACD4] hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('ar')}
                  className={`rounded-full px-[15px] py-[7px] text-[12px] font-mono font-medium tracking-widest transition-all ${
                    lang === 'ar'
                      ? 'bg-gradient-to-r from-[#7A3FFF] via-[#B97BFF] to-[#FF8E6E] text-white shadow-lg shadow-purple-500/25'
                      : 'text-[#B5ACD4] hover:text-white'
                  }`}
                >
                  ع
                </button>
              </div>
            </div>
          </motion.header>

          {/* ======================================================================
              HERO SECTION
              ====================================================================== */}
          <main className="flex flex-1 flex-col justify-center pt-[clamp(40px,7vh,84px)]">
            
            {/* Eyebrow Text */}
            <motion.span
              variants={fadeInUpDelayed(0.14)}
              initial="hidden"
              animate="visible"
              className="font-mono text-[12px] font-medium uppercase tracking-[0.2em] text-[#FF8E6E]"
            >
              {t('eyebrow')}
            </motion.span>

            {/* Headline */}
            <motion.h1
              variants={fadeInUpDelayed(0.24)}
              initial="hidden"
              animate="visible"
              className="mt-[22px] font-display text-[clamp(42px,7vw,88px)] font-semibold leading-[0.98] tracking-tighter text-balance"
            >
              <span className="text-[#F4F0FF]">{t('headlinePart1')}</span>{' '}
              <span className="bg-gradient-to-r from-[#F4F0FF] via-[#B97BFF] to-[#4DF4E1] bg-clip-text text-transparent">
                {t('headlinePart2')}
              </span>
            </motion.h1>

            {/* Lead Paragraph */}
            <motion.p
              variants={fadeInUpDelayed(0.34)}
              initial="hidden"
              animate="visible"
              className="mt-[26px] max-w-[56ch] text-[clamp(16.5px,1.5vw,20px)] leading-relaxed text-[#B5ACD4]"
            >
              {t('lead')}
            </motion.p>

            {/* ======================================================================
                EMAIL CAPTURE FORM
                ====================================================================== */}
            <motion.div
              variants={fadeInUpDelayed(0.44)}
              initial="hidden"
              animate="visible"
              className="mt-[38px] max-w-[480px]"
              id="notify"
            >
              <div className="mb-3 text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-[#8B83A8]">
                {t('notifyLabel')}
              </div>

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-2.5"
                    noValidate
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder={t('emailPlaceholder')}
                      disabled={isSubmitting}
                      className={`flex-1 rounded-full bg-white/5 px-5 py-3.5 text-[15px] text-white outline-none transition-all placeholder:text-[#8B83A8] focus:bg-[rgba(122,63,255,0.07)] focus:ring-2 focus:ring-[#B97BFF] disabled:opacity-50 ${
                        error ? 'ring-2 ring-[#FF8E6E]' : 'ring-1 ring-white/10'
                      }`}
                      aria-label={lang === 'en' ? 'Email address' : 'البريد الإلكتروني'}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7A3FFF] via-[#B97BFF] to-[#FF8E6E] px-6 py-3.5 font-medium text-white shadow-lg shadow-purple-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>{t('submitting')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('submitButton')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2.5 text-[15px] text-[#4DF4E1]"
                    role="status"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4DF4E1]/20">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                    <span>{t('successMessage')}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-[#FF8E6E]"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>

            {/* ======================================================================
                FEATURE PILLARS
                ====================================================================== */}
            <motion.div
              variants={fadeInUpDelayed(0.54)}
              initial="hidden"
              animate="visible"
              className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-white/10 pt-7"
            >
              {[
                'pillarAdmissions',
                'pillarAttendance',
                'pillarFinance',
                'pillarScheduling',
                'pillarParentComm',
                'pillarReporting',
              ].map((pillar, index) => (
                <span key={pillar} className="inline-flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#B97BFF]" />
                  <span className="text-[14px] font-medium text-[#B5ACD4]">{t(pillar as keyof Translations)}</span>
                </span>
              ))}
            </motion.div>

            {/* Mobile Apps Note */}
            <motion.p
              variants={fadeInUpDelayed(0.54)}
              initial="hidden"
              animate="visible"
              className="mt-4 max-w-[640px] text-[13.5px] text-[#8B83A8]"
            >
              {t('mobileApps')}
            </motion.p>
          </main>

          {/* ======================================================================
              FOOTER
              ====================================================================== */}
          <motion.footer
            variants={fadeInUpDelayed(0.64)}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"
          >
            {/* Feature Chips */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(122,63,255,0.10)] px-3.5 py-1.5 text-[12px] font-medium text-[#B97BFF] ring-1 ring-[rgba(122,63,255,0.24)]">
                {t('chipNationalId')}
                <span className="font-mono text-[10.5px] opacity-85">{t('chipRaqamWatani')}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(122,63,255,0.10)] px-3.5 py-1.5 text-[12px] font-medium text-[#B97BFF] ring-1 ring-[rgba(122,63,255,0.24)]">
                {t('chipMoE')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(122,63,255,0.10)] px-3.5 py-1.5 text-[12px] font-medium text-[#B97BFF] ring-1 ring-[rgba(122,63,255,0.24)]">
                {t('chipCliQ')}
              </span>
            </div>

            {/* Integrations */}
            <div className="flex items-center gap-3 text-[11px] font-mono tracking-widest text-[#8B83A8]">
              <span>{t('connectsTo')}</span>
              <b className="font-mono font-medium text-[#B5ACD4]">Google Classroom</b>
              <span className="h-1 w-1 rounded-full bg-[#8B83A8] opacity-50" />
              <b className="font-mono font-medium text-[#B5ACD4]">Microsoft Teams</b>
            </div>
          </motion.footer>

          {/* Meta Footer */}
          <motion.div
            variants={fadeInUpDelayed(0.64)}
            initial="hidden"
            animate="visible"
            className="mt-5.5 flex flex-wrap items-center justify-between gap-3.5 text-[11px] font-mono tracking-widest text-[#8B83A8]"
          >
            <span>{t('footerCopyright')}</span>
            <span>
              {t('earlyAccessLabel')}{' '}
              <a href="mailto:info@munaxa.com" className="text-[#B5ACD4] hover:text-[#4DF4E1]">
                {t('contactEmail')}
              </a>
            </span>
          </motion.div>
        </div>
      </div>

      {/* Custom Styles for Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Tajawal:wght@400;500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');

        :root {
          --font-sans: 'Inter', system-ui, sans-serif;
          --font-display: 'Sora', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          --font-arabic: 'Tajawal', system-ui, sans-serif;
          --font-arabic-body: 'IBM Plex Sans Arabic', system-ui, sans-serif;
        }

        .font-sans {
          font-family: var(--font-sans);
        }

        .font-display {
          font-family: var(--font-display);
        }

        .font-mono {
          font-family: var(--font-mono);
        }

        .font-arabic {
          font-family: var(--font-arabic);
        }

        html[lang="ar"] .font-sans {
          font-family: var(--font-arabic-body);
        }

        html[lang="ar"] .font-display {
          font-family: var(--font-arabic);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// BACKGROUND EFFECTS COMPONENT
// ============================================================================

function BackgroundEffects() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(122,63,255,0.20)] via-transparent to-transparent" />
      
      {/* Radial Gradients */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 50% -5%, rgba(122,63,255,0.20) 0%, rgba(122,63,255,0) 60%),
            radial-gradient(ellipse 50% 45% at 100% 25%, rgba(77,244,225,0.08) 0%, rgba(77,244,225,0) 60%),
            radial-gradient(ellipse 45% 40% at 0% 60%, rgba(255,142,110,0.06) 0%, rgba(255,142,110,0) 60%)
          `,
        }}
      />

      {/* Animated Blobs */}
      <motion.div
        className="absolute -left-[10vw] -top-[14vw] h-[46vw] w-[46vw] rounded-full opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(122,63,255,0.45), transparent 65%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 24, 0],
          y: [0, 16, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute -right-[8vw] top-[8vw] h-[38vw] w-[38vw] rounded-full opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(185,123,255,0.32), transparent 65%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -20, 0],
          y: [0, 20, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute bottom-[-16vw] left-[30vw] h-[34vw] w-[34vw] rounded-full opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(255,142,110,0.18), transparent 65%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -16, 0],
          y: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 38,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Grid Overlay */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: `
            linear-gradient(rgba(184,164,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(184,164,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black, transparent 80%)',
        }}
      />
    </div>
  );
}
