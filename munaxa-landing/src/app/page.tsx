/**
 * MUNAXA COMING SOON LANDING PAGE
 * 
 * A premium, pixel-perfect "Coming Soon" landing page for Munaxa -
 * a comprehensive School OS platform.
 * 
 * Design System Reference: Munaxa Design System (2).html
 * - Colors: Deep midnight purple background with vibrant neon accents
 * - Typography: Sora (display), Inter (body), JetBrains Mono (labels)
 * - Effects: Glassmorphism, soft glows, subtle gradients
 * 
 * Features:
 * - Responsive mobile-first layout
 * - Framer Motion entrance animations
 * - Email subscription form with loading/success/error states
 * - Lucide React icons
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Mail, 
  Check, 
  Loader2, 
  AlertCircle,
  Calendar,
  Users,
  MessageSquare,
  ArrowRight
} from "lucide-react";

// ============================================================================
// ANIMATION VARIANTS (Framer Motion)
// Staggered fade-up animations for premium entrance effects
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1], // Custom easing for premium feel
    },
  },
};

const featureVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// ============================================================================
// EMAIL SUBSCRIPTION FORM COMPONENT
// Handles loading, success, and error states with mock API
// ============================================================================

interface FormState {
  email: string;
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

function EmailSubscriptionForm() {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    status: "idle",
    message: "",
  });

  /**
   * Mock API submission function
   * Simulates a 1-second network delay before returning success/error
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formState.email)) {
      setFormState({
        ...formState,
        status: "error",
        message: "Please enter a valid email address",
      });
      return;
    }

    // Set loading state
    setFormState({ ...formState, status: "loading" });

    // Mock API call with 1-second delay
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate success (in production, replace with actual API call)
      setFormState({
        ...formState,
        status: "success",
        message: "You're on the list! We'll be in touch soon.",
      });
    } catch (error) {
      setFormState({
        ...formState,
        status: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  // Reset form when clicking on the input after success
  const handleInputFocus = () => {
    if (formState.status === "success") {
      setFormState({ email: "", status: "idle", message: "" });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full max-w-md"
      variants={itemVariants}
    >
      <div className="field">
        <label htmlFor="email">Early Access</label>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Email Input Field */}
          <div className="relative flex-1">
            <input
              id="email"
              type="email"
              value={formState.email}
              onChange={(e) =>
                setFormState({ ...formState, email: e.target.value })
              }
              onFocus={handleInputFocus}
              placeholder="Enter your email"
              disabled={formState.status === "loading" || formState.status === "success"}
              className={`w-full pr-12 ${
                formState.status === "error" 
                  ? "border-red-400 focus:border-red-400" 
                  : ""
              }`}
              aria-describedby="form-message"
              aria-invalid={formState.status === "error"}
            />
            {/* Status Icon inside input */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {formState.status === "loading" && (
                <Loader2 className="w-5 h-5 animate-spin text-munaxa-primary" />
              )}
              {formState.status === "success" && (
                <Check className="w-5 h-5 text-green-400" />
              )}
              {formState.status === "error" && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={formState.status === "loading" || formState.status === "success"}
            className={`btn-primary whitespace-nowrap ${
              formState.status === "success" ? "bg-green-500" : ""
            }`}
          >
            {formState.status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : formState.status === "success" ? (
              <>
                <Check className="w-4 h-4" />
                You're In!
              </>
            ) : (
              <>
                Get Early Access
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        
        {/* Status Message */}
        {formState.message && (
          <p
            id="form-message"
            className={`text-sm mt-2 ${
              formState.status === "error" 
                ? "text-red-400" 
                : "text-green-400"
            }`}
            role="alert"
          >
            {formState.message}
          </p>
        )}
      </div>
    </motion.form>
  );
}

// ============================================================================
// FEATURE CARD COMPONENT
// Displays individual feature with icon, title, and description
// ============================================================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: "default" | "aqua" | "coral";
}

function FeatureCard({ icon, title, description, variant = "default" }: FeatureCardProps) {
  const iconClass = variant === "aqua" ? "aqua" : variant === "coral" ? "coral" : "";
  
  return (
    <motion.div
      className="card flex flex-col gap-4"
      variants={featureVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className={`icon-box ${iconClass}`}>
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg text-munaxa-fg">
        {title}
      </h3>
      <p className="text-sm text-munaxa-fgMuted leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// The complete Coming Soon landing page for Munaxa
// ============================================================================

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-munaxa-bg relative overflow-hidden">
      {/* Background gradient overlay (hero glow effect) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(122,63,255,0.18) 0%, rgba(122,63,255,0) 62%),
            radial-gradient(ellipse 60% 50% at 100% 30%, rgba(77,244,225,0.09) 0%, rgba(77,244,225,0) 62%),
            radial-gradient(ellipse 50% 40% at 0% 50%, rgba(255,142,110,0.06) 0%, rgba(255,142,110,0) 62%)
          `,
        }}
      />

      {/* Main content container */}
      <div className="relative z-10 max-w-munaxa-container mx-auto px-[clamp(20px,4vw,40px)] py-12">
        
        {/* HEADER - Logo */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-2.5 mb-16"
        >
          {/* Munaxa Logo Mark (SVG) */}
          <svg
            width="34"
            height="24"
            viewBox="0 0 282 205"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
            aria-label="Munaxa logo"
          >
            {/* Gradient definition matching brand colors */}
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7A3FFF" />
                <stop offset="60%" stopColor="#B97BFF" />
                <stop offset="120%" stopColor="#FF8E6E" />
              </linearGradient>
            </defs>
            {/* Abstract M shape representing Munaxa */}
            <path
              d="M0 205V0L70.5 0L141 102.5L211.5 0L282 0V205H211.5V102.5L141 205H70.5L0 102.5V205Z"
              fill="url(#logoGradient)"
            />
          </svg>
          {/* Wordmark */}
          <span className="font-display font-semibold text-xl tracking-tight text-munaxa-fg">
            munaxa<span className="text-munaxa-fgDim">™</span>
          </span>
        </motion.header>

        {/* HERO SECTION */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24"
        >
          {/* Left Column - Text Content */}
          <div className="flex flex-col gap-6">
            {/* Coming Soon Badge */}
            <motion.div variants={itemVariants}>
              <span className="chip-badge">
                <span className="dot" />
                Coming Soon — v2.4
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-h1 font-display font-semibold leading-tight tracking-tight"
            >
              The Future of{" "}
              <span className="grad-text">School Operations.</span>
            </motion.h1>

            {/* Sub-headline / Lead */}
            <motion.p
              variants={itemVariants}
              className="text-lead max-w-[56ch]"
            >
              Munaxa unifies attendance, CliQ financial ledgers, and parent 
              communication into one lightweight School OS.
            </motion.p>

            {/* Email Subscription Form */}
            <motion.div variants={itemVariants} className="mt-4">
              <EmailSubscriptionForm />
            </motion.div>

            {/* Social Proof */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-4 mt-4"
            >
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-munaxa-bg shrink-0"
                    style={{
                      background: i === 0 
                        ? "linear-gradient(135deg, #7A3FFF, #B97BFF)"
                        : i === 1
                        ? "linear-gradient(135deg, #4DF4E1, #7A3FFF)"
                        : i === 2
                        ? "linear-gradient(135deg, #FF8E6E, #B97BFF)"
                        : "linear-gradient(135deg, #B97BFF, #4DF4E1)",
                      marginLeft: i === 0 ? 0 : undefined,
                    }}
                  />
                ))}
              </div>
              <p className="text-sm text-munaxa-fgMuted">
                <strong className="text-munaxa-fg font-medium">
                  Join 500+ schools
                </strong>{" "}
                on the waitlist
              </p>
            </motion.div>
          </div>

          {/* Right Column - Visual Element (Abstract Dashboard Preview) */}
          <motion.div
            variants={itemVariants}
            className="relative hidden lg:block"
          >
            {/* Card container with glassmorphism */}
            <div
              className="rounded-munaxa-xl p-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #1B1040 0%, #100728 100%)",
                border: "1px solid rgba(184,164,255,0.18)",
                boxShadow: "0 60px 120px -30px rgba(0,0,0,0.6)",
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute top-[-40%] right-[-20%] w-[60%] h-[60%] pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(122,63,255,0.26), transparent 60%)",
                  filter: "blur(40px)",
                }}
              />
              
              {/* Mock UI Header */}
              <div className="flex items-center justify-between mb-4.5 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#FF5F57" }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: "#FEBC2E" }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: "#28C840" }} />
                  <span className="font-mono text-xs text-munaxa-fgDim ml-2.5">
                    munaxa.app/dashboard
                  </span>
                </div>
                <kbd className="px-2 py-1 rounded text-xs font-mono bg-white/6 border border-munaxa-border text-munaxa-fgDim">
                  ⌘K
                </kbd>
              </div>

              {/* Mock Dashboard Grid */}
              <div className="grid grid-cols-3 gap-3.5 relative z-10">
                {/* Mini Calendar */}
                <div className="col-span-1 bg-white/3 border border-munaxa-border rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-munaxa-fg">March 2026</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <div key={i} className="text-[10px] font-mono text-munaxa-fgDim text-center">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: 23 }, (_, i) => (
                      <div
                        key={i}
                        className={`aspect-square grid place-items-center text-[10px] rounded-lg ${
                          i === 11 
                            ? "bg-munaxa-primary text-white font-semibold" 
                            : "text-munaxa-fgMuted"
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="col-span-2 space-y-3.5">
                  {[
                    { label: "Attendance Today", value: "94.2%", color: "#4DF4E1" },
                    { label: "Pending Alerts", value: "3", color: "#FF8E6E" },
                    { label: "Messages", value: "28", color: "#B97BFF" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-white/3 border border-munaxa-border rounded-xl p-4"
                    >
                      <p className="text-xs font-mono text-munaxa-fgDim mb-1">{stat.label}</p>
                      <p className="text-2xl font-display font-semibold" style={{ color: stat.color }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* FEATURES SECTION */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-24"
        >
          <div className="flex flex-col gap-4 max-w-[720px] mb-14">
            <span className="eyebrow">Core Pillars</span>
            <h2 className="text-h2 font-display font-semibold">
              Everything your school needs,{" "}
              <span className="grad-text">nothing it doesn't.</span>
            </h2>
            <p className="text-lead">
              Three powerful modules working together seamlessly. No more juggling 
              multiple systems or dealing with data silos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Calendar className="w-5.5 h-5.5" />}
              title="Zero-Hardware Attendance"
              description="RFID-free check-in using existing infrastructure. Automatic registers, real-time notifications to parents."
              variant="default"
            />
            <FeatureCard
              icon={<Users className="w-5.5 h-5.5" />}
              title="CliQ Integration"
              description="Seamless financial ledger management. Fee collection, expense tracking, and automated reporting."
              variant="aqua"
            />
            <FeatureCard
              icon={<MessageSquare className="w-5.5 h-5.5" />}
              title="Parent Communication"
              description="Unified messaging hub. Announcements, individual messages, and two-way communication channels."
              variant="coral"
            />
          </div>
        </motion.section>

        {/* FINAL CTA SECTION */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div
            className="rounded-munaxa-xl p-[clamp(48px,10vw,80px)] text-center relative overflow-hidden"
            style={{
              background: `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(122,63,255,0.24), transparent 60%),
                           linear-gradient(180deg, #1B1040 0%, #0B0518 100%)`,
              border: "1px solid rgba(184,164,255,0.18)",
            }}
          >
            <div className="relative z-10 flex flex-col items-center gap-6">
              <span className="eyebrow">Early Access · Limited Spots</span>
              <h2 className="text-h1 font-display font-semibold">
                Ready to transform your{" "}
                <span className="grad-text">school operations?</span>
              </h2>
              <p className="text-lead max-w-[56ch]">
                Be among the first to experience Munaxa. Join our exclusive 
                early access program and shape the future of education technology.
              </p>
              <EmailSubscriptionForm />
            </div>
          </div>
        </motion.section>

        {/* FOOTER */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border-t border-munaxa-border pt-10 pb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <svg
                width="24"
                height="17"
                viewBox="0 0 282 205"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 opacity-60"
              >
                <defs>
                  <linearGradient id="logoGradientSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7A3FFF" />
                    <stop offset="60%" stopColor="#B97BFF" />
                    <stop offset="120%" stopColor="#FF8E6E" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 205V0L70.5 0L141 102.5L211.5 0L282 0V205H211.5V102.5L141 205H70.5L0 102.5V205Z"
                  fill="url(#logoGradientSmall)"
                />
              </svg>
              <span className="font-mono text-xs tracking-widest text-munaxa-fgDim">
                MUNAXA · SCHOOL OS · © 2026
              </span>
            </div>
            <nav className="flex gap-6">
              <a href="#" className="font-mono text-xs tracking-widest text-munaxa-fgDim hover:text-munaxa-fg transition-colors">
                Privacy
              </a>
              <a href="#" className="font-mono text-xs tracking-widest text-munaxa-fgDim hover:text-munaxa-fg transition-colors">
                Terms
              </a>
              <a href="#" className="font-mono text-xs tracking-widest text-munaxa-fgDim hover:text-munaxa-fg transition-colors">
                Contact
              </a>
            </nav>
          </div>
        </motion.footer>
      </div>
    </main>
  );
}
