import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/public/services/${id}`)
      .then((res) => setService(res.data.service))
      .catch(() => setError('This service is not available.'));
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">{error}</div>;
  if (!service) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-400">Loading…</div>;

  const docs = Array.isArray(service.requiredDocs) ? service.requiredDocs : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex h-48 items-center justify-center bg-brand-50 text-5xl">
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.title} className="h-full w-full object-cover" />
          ) : (
            service.iconUrl || '🛠️'
          )}
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">{service.title}</h1>
          {service.tagline && <p className="mt-1 text-gray-500">{service.tagline}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">
              ₹{Number(service.price).toLocaleString('en-IN')}
            </span>
            {service.estimatedDays && (
              <span className="text-gray-500">Estimated completion: {service.estimatedDays} day(s)</span>
            )}
          </div>

          <p className="mt-6 whitespace-pre-line text-gray-700">{service.description}</p>

          {docs.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900">Required Documents</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
                {docs.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          )}

          {service.termsAndNotes && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900">Terms & Notes</h3>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{service.termsAndNotes}</p>
            </div>
          )}

          <Link
            to={`/order/${service.id}`}
            className="mt-8 inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Order This Service
          </Link>
        </div>
      </div>
    </div>
  );
}
