import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

const ORDER_STATUSES = ['PENDING', 'IN_PROGRESS', 'DOCUMENTS_REQUIRED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED', 'FAILED'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const { isSuperadmin } = useAuth();
  const [order, setOrder] = useState(null);
  const [note, setNote] = useState('');
  const [deliverableFile, setDeliverableFile] = useState(null);
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false);

  const load = () => api.get(`/orders/${id}`).then((res) => setOrder(res.data.order));

  useEffect(() => { load(); }, [id]);

  const handleUploadDeliverable = async (e) => {
    e.preventDefault();
    if (!deliverableFile) return;
    setUploadingDeliverable(true);
    try {
      const formData = new FormData();
      formData.append('file', deliverableFile);
      await api.post(`/orders/${id}/deliverables`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Completed work uploaded — the customer has been notified.');
      setDeliverableFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload the file.');
    } finally {
      setUploadingDeliverable(false);
    }
  };

  const removeDeliverable = async (docId) => {
    if (!confirm('Remove this deliverable? The customer will no longer be able to download it.')) return;
    try {
      await api.delete(`/orders/${id}/deliverables/${docId}`);
      toast.success('Deliverable removed.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove the deliverable.');
    }
  };

  const updateStatus = async (status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status, note: note || undefined });
      toast.success('Order status updated.');
      setNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status.');
    }
  };

  const updatePayment = async (paymentStatus) => {
    try {
      await api.patch(`/orders/${id}/payment`, { paymentStatus });
      toast.success('Payment status updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update payment status.');
    }
  };

  if (!order) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">{order.service?.title}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{order.status}</span>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Customer</h2>
          <p className="mt-2 text-sm text-gray-700">{order.customer?.name}</p>
          <p className="text-sm text-gray-500">{order.customer?.email}</p>
          <p className="text-sm text-gray-500">{order.customer?.phone}</p>
          {order.notes && <p className="mt-3 text-sm text-gray-600">Notes: {order.notes}</p>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Payment</h2>
          <p className="mt-2 text-sm text-gray-700">Amount: ₹{Number(order.amount).toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500">Status: {order.paymentStatus}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PAYMENT_STATUSES.map((ps) => (
              <button
                key={ps}
                onClick={() => updatePayment(ps)}
                disabled={ps === order.paymentStatus}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                {ps}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Update Status</h2>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for this status change"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={s === order.status}
              className="rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-40"
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Customer's Uploaded Documents</h2>
        {order.documents?.filter((d) => d.type === 'CUSTOMER_UPLOAD').length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {order.documents.filter((d) => d.type === 'CUSTOMER_UPLOAD').map((d) => (
              <li key={d.id}>
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                  {d.fileName}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-400">No documents uploaded by the customer yet.</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Deliver Completed Work</h2>
        <p className="mt-1 text-xs text-gray-500">
          Upload the finished file here. The customer gets an email + browser notification with a download link on their Track Order page.
        </p>

        {order.documents?.filter((d) => d.type === 'DELIVERABLE').length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {order.documents.filter((d) => d.type === 'DELIVERABLE').map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                  {d.fileName}
                </a>
                <button onClick={() => removeDeliverable(d.id)} className="text-xs text-red-500 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleUploadDeliverable} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="file"
            onChange={(e) => setDeliverableFile(e.target.files?.[0] || null)}
            className="flex-1 text-sm"
          />
          <button
            disabled={uploadingDeliverable || !deliverableFile}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {uploadingDeliverable ? 'Uploading…' : 'Upload & Notify Customer'}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">History</h2>
        <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-4">
          {order.statusHistory.map((h) => (
            <div key={h.id}>
              <p className="text-sm font-medium text-gray-800">{h.status.replace('_', ' ')}</p>
              {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
              <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {isSuperadmin && <p className="mt-4 text-xs text-gray-400">Owner: {order.owner?.name}</p>}
    </div>
  );
}
