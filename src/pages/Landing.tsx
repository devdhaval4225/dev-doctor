import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope,
  Calendar,
  Users,
  Activity,
  ArrowRight,
  CheckCircle,
  Heart,
  Shield,
  Clock,
  Zap,
  Mail
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: 'Simple Scheduling',
      description: 'Manage appointments without complexity.'
    },
    {
      icon: Users,
      title: 'Patient Records',
      description: 'All patient data in one secure place.'
    },
    {
      icon: Activity,
      title: 'Daily Overview',
      description: 'Know what’s happening in your clinic today.'
    }
  ];

  const benefits = [
    'Designed for small clinics & solo doctors',
    'No complicated setup',
    'Secure & privacy-first',
    'Works on any device',
    'Early users influence product direction'
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Stethoscope className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">MediNexus</span>
            <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              Early Access
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="font-medium text-gray-600 hover:text-blue-600">
              Sign In
            </Link>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <section className="max-w-7xl mx-auto px-6 py-28 text-center">
        <h1 className="text-6xl font-extrabold mb-6">
          Practice Management
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Made Simple
          </span>
        </h1>

        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          MediNexus helps clinics manage appointments, patients,
          and daily operations — without complexity.
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2"
          >
            Get Early Access <ArrowRight />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 border border-gray-300 rounded-xl font-bold"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* ================= WHO IS THIS FOR ================= */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold mb-12">
            Who Is MediNexus For?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow">
              <Users className="w-10 h-10 text-blue-600 mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">Solo Doctors</h3>
              <p className="text-gray-600">
                Manage your practice without extra staff or tools.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow">
              <Heart className="w-10 h-10 text-pink-600 mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">Small Clinics</h3>
              <p className="text-gray-600">
                Keep operations smooth and organized.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow">
              <Shield className="w-10 h-10 text-green-600 mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">Growing Practices</h3>
              <p className="text-gray-600">
                Start simple, scale confidently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold text-center mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">1. Create Account</h3>
              <p className="text-gray-600">Sign up in less than a minute.</p>
            </div>

            <div className="text-center">
              <Calendar className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">2. Add Appointments</h3>
              <p className="text-gray-600">Start managing your schedule.</p>
            </div>

            <div className="text-center">
              <Activity className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">3. Run Your Clinic</h3>
              <p className="text-gray-600">Stay focused on patient care.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BENEFITS ================= */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-600 py-24 text-white">
        <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl font-extrabold mb-6">
              Why Start With MediNexus?
            </h2>
            <ul className="space-y-4">
              {benefits.map((b, i) => (
                <li key={i} className="flex gap-3 items-center">
                  <CheckCircle className="w-6 h-6 text-green-300" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white text-gray-900 p-10 rounded-3xl text-center shadow-xl">
            <Zap className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-2xl font-bold mb-4">Join Early</h3>
            <p className="text-gray-600 mb-6">
              Be part of the early users shaping MediNexus.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold"
            >
              Get Early Access
            </button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-gray-900 text-gray-300 py-16 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">MediNexus</h3>
            <p className="text-sm">
              Simple practice management for modern clinics.
            </p>
          </div>

          {/* <div>
            <h4 className="text-white font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/early-access">Early Access</Link></li>
              <li><Link to="/roadmap">Roadmap</Link></li>
            </ul>
          </div> */}

          <div>
            <h4 className="text-white font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              {/* <li><Link to="/careers">Careers</Link></li> */}
            </ul>

          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              support@medinexus.com
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mt-10">
          © {new Date().getFullYear()} MediNexus. All rights reserved.
        </div>
      </footer>

    </div>
  );
};

export default Landing;
