
import React from 'react';

export const About = () => {
  return (
    <div className="p-8 animate-in fade-in duration-700 max-w-[1400px] mx-auto space-y-16 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-[10px] font-black uppercase tracking-widest">
            <span className="size-2 bg-primary rounded-full animate-pulse"></span>
            Our Mission
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Digital Health <br />
            <span className="text-primary italic">Reimagined.</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed">
            MediCRM was founded with a singular purpose: to empower Indian healthcare providers with clinical tools that are as intuitive as they are powerful. We bridge the gap between complex medical documentation and patient-centric care.
          </p>
        </div>
      </section>

      {/* Core Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { 
            title: 'AI-First Approach', 
            desc: 'Leveraging Gemini 3.0 Pro to automate clinical scribing and documentation, saving doctors over 40% of their time.',
            icon: 'auto_awesome',
            color: 'blue'
          },
          { 
            title: 'HIPAA & GDPR Ready', 
            desc: 'End-to-end encryption and strict data sovereignty protocols ensure your patients\' clinical history remains private.',
            icon: 'security',
            color: 'green'
          },
          { 
            title: 'Digital India Ready', 
            desc: 'Optimized for local connectivity and built to support the ABHA (Ayushman Bharat Digital Mission) framework.',
            icon: 'account_balance',
            color: 'purple'
          }
        ].map(item => (
          <div key={item.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
            <div className={`size-16 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
              <span className="material-symbols-outlined text-3xl filled">{item.icon}</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">{item.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Team/Philosophy Section */}
      <section className="flex flex-col md:flex-row gap-16 items-center py-12">
        <div className="flex-1 space-y-6">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Clinical Excellence <br />at Scale</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Our team consists of senior developers, data scientists, and clinical advisors who believe that technology should be a partner in healing, not a hurdle. By centralizing vitals, history, and notes, we provide a 360° view of patient health.
          </p>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
               <span className="block text-3xl font-black text-primary mb-1">2,500+</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Providers</span>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
               <span className="block text-3xl font-black text-primary mb-1">1M+</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lives Impacted</span>
             </div>
          </div>
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-primary/10 blur-[100px] -z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop" 
            alt="Medical Team" 
            className="rounded-[3rem] shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
          />
        </div>
      </section>

      {/* Tech Stack Bar */}
      <div className="flex flex-wrap items-center justify-center gap-12 py-8 border-y border-slate-100 dark:border-slate-800 opacity-50 grayscale hover:grayscale-0 transition-all">
        <span className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Powered By</span>
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">cloud</span> <span className="text-xs font-black uppercase tracking-widest">Google Cloud</span></div>
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">psychology</span> <span className="text-xs font-black uppercase tracking-widest">Gemini AI</span></div>
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">database</span> <span className="text-xs font-black uppercase tracking-widest">Firebase</span></div>
      </div>
    </div>
  );
};
