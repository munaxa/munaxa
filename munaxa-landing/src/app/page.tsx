"use client";

import React, { useState, FormEvent } from "react";
import { motion, type Variants } from "framer-motion";
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Mail, 
  ArrowRight, 
  Calendar as CalendarIcon,
  Users,
  MessageSquare,
  ShieldCheck,
  Zap,
  BarChart3
} from "lucide-react";

// --- Animation Variants (Fixed Types) ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Fixed: Using "easeOut" string instead of array to satisfy TS types
const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

const featureVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.2 + i * 0.1,
    },
  }),
};

// --- Components ---

const Badge = () => (
  <motion.div 
    variants={itemVariants}
    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-200 mb-6 backdrop-blur-sm"
  >
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
    </span>
    Coming Soon — v2.4
  </motion.div>
);

const Header = () => (
  <motion.header 
    variants={itemVariants}
    className="flex justify-between items-center w-full max-w-7xl mx-auto px-6 py-6 mb-12"
  >
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
        <span className="text-white font-bold text-lg">M</span>
      </div>
      <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
        Munaxa
      </span>
    </div>
    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
      <a href="#features" className="hover:text-white transition-colors">Features</a>
      <a href="#waitlist" className="hover:text-white transition-colors">Waitlist</a>
      <a href="#" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white">
        Login
      </a>
    </nav>
  </motion.header>
);

const EmailForm = ({ id = "waitlist" }: { id?: string }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    
    // Mock API Call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setStatus("success");
    setMessage("You're on the list! We'll be in touch soon.");
    setEmail("");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md relative group">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-white/40 pointer-events-none">
          <Mail size={20} />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Enter your school email"
          disabled={status === "loading" || status === "success"}
          className={`w-full pl-12 pr-32 py-3.5 rounded-xl bg-white/5 border ${
            status === "error" 
              ? "border-red-500/50 focus:border-red-500" 
              : "border-white/10 focus:border-purple-500"
          } outline-none text-white placeholder:text-white/30 transition-all disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className={`absolute right-2 top-2 bottom-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
            status === "success"
              ? "bg-green-500/20 text-green-400 cursor-default"
              : "bg-white text-black hover:bg-purple-50 hover:text-purple-900"
          } disabled:opacity-80`}
        >
          {status === "loading" ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Joining...</span>
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle2 size={16} />
              <span>Joined!</span>
            </>
          ) : (
            <>
              <span>Get Access</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
      
      {/* Status Messages */}
      <div className={`mt-2 text-sm flex items-center gap-1.5 transition-all duration-300 ${
        status === "error" ? "text-red-400 opacity-100" : "opacity-0 h-0 overflow-hidden"
      }`}>
        <AlertCircle size={14} />
        {message}
      </div>
      
      <div className={`mt-2 text-sm flex items-center gap-1.5 transition-all duration-300 ${
        status === "success" ? "text-green-400 opacity-100" : "opacity-0 h-0 overflow-hidden"
      }`}>
        <CheckCircle2 size={14} />
        {message}
      </div>
    </form>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, delay }: { icon: any, title: string, desc: string, delay: number }) => (
  <motion.div
    custom={delay}
    variants={featureVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-50px" }}
    className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all group"
  >
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
      <Icon className="text-purple-300 group-hover:text-white transition-colors" size={24} />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
  </motion.div>
);

const DashboardPreview = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95, y: 40 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 1, delay: 0.4 }}
    className="relative mt-16 lg:mt-0 lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 w-full max-w-lg lg:max-w-xl"
  >
    {/* Glow Effect */}
    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur-2xl opacity-20"></div>
    
    {/* Card Container */}
    <div className="relative rounded-2xl bg-[#140A2E] border border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
        <div className="text-xs text-white/30 font-mono">munaxa.os</div>
      </div>

      {/* Content Grid */}
      <div className="p-4 grid grid-cols-3 gap-3">
        {/* Mini Calendar */}
        <div className="col-span-2 bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-white">October</span>
            <CalendarIcon size={14} className="text-white/40" />
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-white/40">
            {['M','T','W','T','F','S','S'].map(d => <span key={d}>{d}</span>)}
            {[...Array(31)].map((_, i) => (
              <span key={i} className={`py-1 rounded ${i === 12 ? 'bg-purple-500 text-white' : 'hover:bg-white/5'}`}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Stats Column */}
        <div className="col-span-1 space-y-3">
          <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl p-3 border border-purple-500/20">
            <Users size={16} className="text-purple-300 mb-2" />
            <div className="text-lg font-bold text-white">98%</div>
            <div className="text-[10px] text-white/50">Attendance</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <MessageSquare size={16} className="text-blue-300 mb-2" />
            <div className="text-lg font-bold text-white">24</div>
            <div className="text-[10px] text-white/50">New Msgs</div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="col-span-3 bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <ShieldCheck size={16} className="text-green-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-white">System Healthy</div>
              <div className="text-[10px] text-white/40">All services operational</div>
            </div>
          </div>
          <BarChart3 size={20} className="text-white/20" />
        </div>
      </div>
    </div>
  </motion.div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0518] text-white selection:bg-purple-500/30 overflow-x-hidden font-sans">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-cyan-900/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pb-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 min-h-[80vh] pt-10"
        >
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            <Badge />
            
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
            >
              The Future of <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400">
                School Operations.
              </span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg text-white/60 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Munaxa unifies attendance, CliQ financial ledgers, and parent communication into one lightweight School OS. Zero hardware required.
            </motion.p>

            <motion.div variants={itemVariants} className="mb-8">
              <EmailForm />
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-center lg:justify-start gap-4 text-sm text-white/40"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0B0518] bg-white/10 flex items-center justify-center text-xs font-medium">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p>Join <span className="text-white font-medium">500+</span> schools on the waitlist</p>
            </motion.div>
          </div>

          {/* Right Visual */}
          <div className="flex-1 w-full relative">
            <DashboardPreview />
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.section 
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="mt-32 border-t border-white/5 pt-20"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for Modern Schools</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Everything you need to run your institution efficiently, without the bloat of legacy systems.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard 
              icon={Zap}
              title="Zero-Hardware Attendance"
              desc="Geofenced mobile check-in for staff and students. No expensive scanners or cards needed."
              delay={0}
            />
            <FeatureCard 
              icon={BarChart3}
              title="CliQ Financial Integration"
              desc="Seamless ledger synchronization. Track fees, expenses, and payroll in real-time."
              delay={1}
            />
            <FeatureCard 
              icon={MessageSquare}
              title="Parent Communication Hub"
              desc="Direct messaging, announcements, and report cards in one unified thread."
              delay={2}
            />
          </div>
        </motion.section>

        {/* Final CTA */}
        <motion.section 
          id="waitlist"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-32 mb-20"
        >
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-purple-900/20 to-indigo-900/20 border border-white/10 p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to upgrade your school?</h2>
              <p className="text-white/60 mb-8">
                Secure your spot for early access and get 50% off for the first year when we launch.
              </p>
              <div className="flex justify-center">
                <EmailForm id="final-waitlist" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="border-t border-white/5 pt-12 pb-8 text-center text-sm text-white/30">
          <div className="flex justify-center gap-8 mb-8">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
          <p>&copy; {new Date().getFullYear()} Munaxa Inc. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
