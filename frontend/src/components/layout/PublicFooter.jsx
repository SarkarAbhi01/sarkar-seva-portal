import { Link } from 'react-router-dom';

export default function PublicFooter({ settings }) {
  const links = settings?.footerLinks || [
    { label: 'Terms of Service', url: '/terms' },
    { label: 'Privacy Policy', url: '/privacy' },
    { label: 'Track Order', url: '/track' },
  ];

  return (
    <footer id="contact" className="border-t bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{settings?.portalName || 'Seva Portal'}</h3>
            <p className="mt-2 text-sm text-gray-400">
              All your essential services in one place — fast, transparent, reliable.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map((l) => (
                <li key={l.label}>
                  <Link to={l.url} className="hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-400">
              {settings?.contactEmail && <li>{settings.contactEmail}</li>}
              {settings?.contactPhone && <li>{settings.contactPhone}</li>}
              {settings?.contactAddress && <li>{settings.contactAddress}</li>}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {settings?.portalName || 'Seva Portal'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
