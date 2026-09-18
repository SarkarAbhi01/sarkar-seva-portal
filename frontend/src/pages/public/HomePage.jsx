import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import ServiceCard from '../../components/public/ServiceCard.jsx';

const STEPS = [
  { title: 'सेवा चुनें', subtitle: 'Choose a Service', desc: 'Browse our list of published services and pick the one you need.' },
  { title: 'विवरण भरें', subtitle: 'Fill Details', desc: 'Share your details and upload any required documents.' },
  { title: 'ट्रैक करें', subtitle: 'Track & Receive', desc: 'Track your order status in real time until completion.' },
];

export default function HomePage() {
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false); 

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  
  useEffect(() => {
    api.get('/public/settings')
      .then(res => setSettings(res.data.settings))
      .catch(err => console.error("Settings Error:", err));
  }, []);

  
  useEffect(() => {
    if (page === 1) {
      setLoading(true);
    } else {
      setBtnLoading(true);
    }
    
    api.get('/public/services', { params: { page: page, limit: 6 } })
      .then((svcRes) => {
        const newServices = svcRes.data.data || [];

        if (page === 1) {
          setServices(newServices);
        } else {
          setServices((prev) => [...prev, ...newServices]);
        }

        
        if (newServices.length < 6) {
          setHasMore(false);
        }
      })
      .catch(err => console.error("Services Load Error:", err))
      .finally(() => {
        setLoading(false);
        setBtnLoading(false);
      });
  }, [page]);

  const hero = settings?.homepageHero || {};

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
              {hero.headline || 'All Your Essential Services in One Place'}
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              {hero.subheadline || 'Fast, transparent, and reliable service processing — from application to completion.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#services" className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700">
                {hero.ctaPrimary || 'Explore Services'}
              </a>
              <Link to="/track" className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                {hero.ctaSecondary || 'Track Your Order'}
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-64 w-64 items-center justify-center rounded-full bg-brand-100 text-7xl sm:h-80 sm:w-80">
              🗂️
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section id="services" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">लोकप्रिय सेवाएँ / Popular Services</h2>
          <p className="mt-2 text-gray-500">Only published, active services are shown here.</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-400">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="text-center text-gray-400">No services available right now. Please check back soon.</p>
        ) : (
          <div>
            {/* Services Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>

            {/* 🔽 लोड मोर बटन का लॉजिक (Tailwind CSS के साथ) 🔽 */}
            <div className="mt-12 flex flex-col items-center justify-center">
              {hasMore && (
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={btnLoading}
                  className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {btnLoading ? 'Loading...' : 'Load More / और दिखाएँ'}
                </button>
              )}

              {/* सारा डेटा लोड होने के बाद मैसेज */}
              {!hasMore && services.length > 0 && (
                <p className="text-sm text-gray-400 italic">
                  ✓ सभी सेवाएँ लोड हो चुकी हैं / All services loaded.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">कैसे काम करता है?</h2>
          <p className="mt-2 text-gray-500">सिर्फ 3 आसान steps.</p>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.subtitle} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm text-brand-700">{step.subtitle}</p>
                <p className="mt-2 text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
