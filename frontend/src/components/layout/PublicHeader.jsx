import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Services', to: '/#services' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Order', to: '/#services' },
  { label: 'Contact', to: '/#contact' },
];

export default function PublicHeader({ settings }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (to) => {
    setOpen(false);
    const hash = to.split('#')[1];
    if (location.pathname !== '/') {
      navigate(to);
      return;
    }
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-shadow ${
        scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-white'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.portalName} className="h-8 w-8 rounded" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
              S
            </div>
          )}
          <span className="text-lg font-semibold text-gray-900">{settings?.portalName || 'Seva Portal'}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.to)}
              className="text-sm font-medium text-gray-600 transition hover:text-brand-600"
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => handleNavClick('/#services')}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Order Now
          </button>
        </nav>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-700 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="text-2xl leading-none">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <div className="border-t bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.to)}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleNavClick('/#services')}
              className="mt-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Order Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
