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
  Star,
  TrendingUp,
  Award
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: 'Appointment Management',
      description: 'Schedule and manage appointments seamlessly with an intuitive calendar interface.',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Users,
      title: 'Patient Management',
      description: 'Maintain comprehensive patient records with easy access to medical history.',
      color: 'text-green-600 bg-green-50'
    },
    {
      icon: Activity,
      title: 'Real-time Updates',
      description: 'Get instant notifications and updates about appointments and patient activities.',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is protected with enterprise-grade security and privacy measures.',
      color: 'text-red-600 bg-red-50'
    },
    {
      icon: Clock,
      title: 'Time Efficient',
      description: 'Streamline your workflow and save time with automated scheduling and reminders.',
      color: 'text-orange-600 bg-orange-50'
    },
    {
      icon: Heart,
      title: 'Patient Care Focus',
      description: 'Focus on what matters most - providing excellent care to your patients.',
      color: 'text-pink-600 bg-pink-50'
    }
  ];

  const benefits = [
    'Streamlined appointment scheduling',
    'Comprehensive patient records management',
    'Real-time notifications and updates',
    'Secure data storage and privacy',
    'Easy-to-use interface',
    '24/7 accessibility'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <Stethoscope className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">MediNexus</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="font-semibold text-gray-700 hover:text-blue-600">
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6 font-bold">
          <Star className="w-4 h-4" />
          Trusted by 10,000+ doctors
        </div>
        <h1 className="text-6xl font-extrabold mb-6">
          Transform Your Medical
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Practice Today
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          All-in-one platform to manage appointments, patients, and medical records.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2"
          >
            Start Free Trial <ArrowRight />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 border-2 border-gray-200 rounded-xl font-bold"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-lg">
                <div className={`w-16 h-16 ${f.color} rounded-2xl flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section
        className="bg-gradient-to-br from-blue-600 to-purple-600 py-24 text-white"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2z'/%3E%3C/g%3E%3C/svg%3E\")"
        }}
      >
        <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl font-extrabold mb-6">Why Choose MediNexus</h2>
            <ul className="space-y-4">
              {benefits.map((b, i) => (
                <li key={i} className="flex gap-3 items-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/10 p-10 rounded-3xl text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-4 bg-white text-blue-600 rounded-xl font-bold"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-extrabold mb-4">Start Managing Smarter Today</h2>
        <p className="text-gray-600 mb-6">Join thousands of medical professionals worldwide.</p>
        <button
          onClick={() => navigate('/register')}
          className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold"
        >
          Get Started Free
        </button>
      </section>
    </div>
  );
};

export default Landing;
