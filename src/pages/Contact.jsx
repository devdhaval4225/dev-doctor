
import React, { useState, useEffect } from 'react';


export const Contact = ({ onBack }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTime, setLoadingTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Support Request',
    message: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let interval;
    if (isSubmitting) {
      const updateTime = () => {
        const now = new Date();
        setLoadingTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      };
      updateTime();
      interval = window.setInterval(updateTime, 1000);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate server response
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIsSubmitting(false);
    setShowSuccess(true);
    setFormData({ name: '', email: '', subject: 'Support Request', message: '' });
    setTimeout(() => setShowSuccess(false), 5000);
  };

  return (
    <div className="p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Get In Touch</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Need clinical technical support or have questions about our enterprise plans? Our specialist team is here to help 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Contact Info (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary text-white p-10 rounded-[3rem] shadow-2xl shadow-primary/20 space-y-10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 opacity-60">HQ Location</h3>
              <p className="text-xl font-bold leading-tight">
                Level 12, World Trade Center,<br />
                Tower B, Kharadi,<br />
                Pune, MH 411014
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined filled">call</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Helpline</p>
                  <p className="font-bold">+91 20 4059 9000</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined filled">mail</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">General Inquiry</p>
                  <p className="font-bold">support@medicrm.in</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-60">Social Impact</h3>
               <div className="flex gap-4">
                  <div className="size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors"><span className="material-symbols-outlined text-sm">hub</span></div>
                  <div className="size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors"><span className="material-symbols-outlined text-sm">share</span></div>
                  <div className="size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors"><span className="material-symbols-outlined text-sm">public</span></div>
               </div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
             <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Technical Status</h4>
             <div className="flex items-center gap-2">
                <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">All Systems Operational</span>
             </div>
          </div>
        </div>

        {/* Form (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 sm:p-16 rounded-[3rem] shadow-sm relative overflow-hidden">
            {showSuccess && (
              <div className="absolute inset-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
                <div className="size-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-5xl filled">check_circle</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Inquiry Received</h3>
                <p className="text-slate-500 mt-2 font-medium">Thank you for reaching out. A support engineer will be assigned to your case shortly.</p>
                <button onClick={() => setShowSuccess(false)} className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">Send Another</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Dr. Anish Kumar"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/10 text-sm font-bold outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="dr.anish@practice.in"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/10 text-sm font-bold outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                <select 
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/10 text-sm font-bold outline-none appearance-none"
                >
                  <option>Support Request</option>
                  <option>Billing Question</option>
                  <option>Clinical AI Feedback</option>
                  <option>Partnership Proposal</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Message</label>
                <textarea 
                  required
                  rows={6}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  placeholder="Tell us how we can help your practice..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/10 text-sm font-bold outline-none transition-all resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 group overflow-hidden relative"
              >
                {isSubmitting ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <div className="size-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Syncing Transmission...</span>
                    </div>
                    <span className="text-[8px] opacity-60 mt-0.5 tracking-[0.2em]">{loadingTime}</span>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">send</span>
                    Dispatch Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
