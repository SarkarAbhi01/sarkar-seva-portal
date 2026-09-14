import { Link } from 'react-router-dom';

export default function ServiceCard({ service }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex h-40 items-center justify-center bg-brand-50">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">{service.iconUrl || '🛠️'}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-gray-900">{service.title}</h3>
        {service.tagline && <p className="mt-1 text-sm text-gray-500">{service.tagline}</p>}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-brand-700">
            ₹{Number(service.price).toLocaleString('en-IN')}
          </span>
          {service.estimatedDays && (
            <span className="text-gray-500">{service.estimatedDays} day{service.estimatedDays > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            to={`/services/${service.id}`}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            More Details
          </Link>
          <Link
            to={`/order/${service.id}`}
            className="flex-1 rounded-lg bg-brand-600 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
          >
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
}
