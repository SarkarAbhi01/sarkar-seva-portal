import { useState } from 'react';
import api from '../../api/client';
import { loadRazorpayScript } from '../../utils/razorpay';
import { subscribeOrderToPush } from '../../utils/push';

const STATUS_LABELS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  DOCUMENTS_REQUIRED: 'Documents Required',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [uploadToken, setUploadToken] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const [subscribing, setSubscribing] = useState(false);
  const [notifStatus, setNotifStatus] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setPaid(false);
    setLoading(true);
    try {
      const { data } = await api.get('/public/orders/track', { params: { orderNumber, contact } });
      setOrder(data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadMsg('');
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('uploadToken', uploadToken);
      await api.post(`/public/orders/${order.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMsg('Document uploaded successfully.');
      setFile(null);
    } catch (err) {
      setUploadMsg(err.response?.data?.message || 'Could not upload document. Check your upload token.');
    } finally {
      setUploading(false);
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Could not load payment gateway. Please check your connection.');
        return;
      }

      const { data } = await api.post('/public/payments/create-order', { orderId: order.id });

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: order.service?.title || 'Seva Portal',
        description: `Payment for order ${order.orderNumber}`,
        order_id: data.razorpayOrderId,
        handler: async (response) => {
          try {
            await api.post('/public/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPaid(true);
          } catch {
            setError('Payment verification failed. Please contact support if the amount was deducted.');
          }
        },
        theme: { color: '#2563eb' },
      });

      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Online payment is currently unavailable. Please contact support.');
    } finally {
      setPaying(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!uploadToken) {
      setNotifStatus('Enter your upload token above first.');
      return;
    }
    setSubscribing(true);
    setNotifStatus('');
    const result = await subscribeOrderToPush(order.id, uploadToken);
    setNotifStatus(
      result.subscribed
        ? "You'll now get browser notifications when this order updates."
        : result.error || 'Could not enable notifications.'
    );
    setSubscribing(false);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
      <p className="mt-1 text-sm text-gray-500">Enter your order number and the email/phone you used to place it.</p>

      <form onSubmit={handleSearch} className="mt-6 space-y-4">
        <input
          required
          placeholder="Order Number (e.g. SP-2026-000123)"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          required
          placeholder="Email or Phone"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Track Order'}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {order && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">{order.service.title}</h2>
          <p className="mt-1 text-sm text-gray-500">Order #{order.orderNumber}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {STATUS_LABELS[order.status] || order.status}
            </span>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              order.paymentStatus === 'PAID' || paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {paid ? 'PAID' : order.paymentStatus}
            </span>
          </div>

          {/* Pay Now — for orders that were never paid at placement time */}
          {order.paymentStatus !== 'PAID' && !paid && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                This order hasn't been paid yet. Amount due: <strong>₹{Number(order.amount).toLocaleString('en-IN')}</strong>
              </p>
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="mt-3 w-full rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                {paying ? 'Opening payment…' : 'Pay Now'}
              </button>
            </div>
          )}
          {paid && (
            <p className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              ✅ Payment received — thank you!
            </p>
          )}

          {/* Completed work delivery */}
          {order.documents?.length > 0 && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">🎉 Your completed work is ready</p>
              <ul className="mt-2 space-y-1">
                {order.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-brand-700 underline hover:text-brand-800"
                    >
                      ⬇ Download {d.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 space-y-3 border-l-2 border-gray-200 pl-4">
            {order.statusHistory.map((h, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-800">{STATUS_LABELS[h.status] || h.status}</p>
                {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold text-gray-900">Your Upload Token</h3>
            <p className="mt-1 text-xs text-gray-500">
              Needed below to upload documents or enable notifications for this order (you received it when you placed the order).
            </p>
            <input
              placeholder="Upload Token"
              value={uploadToken}
              onChange={(e) => setUploadToken(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />

            <form onSubmit={handleUpload} className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-gray-700">Upload a Document</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
              <button
                disabled={uploading || !file}
                className="w-full rounded-lg bg-gray-800 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload Document'}
              </button>
              {uploadMsg && <p className="text-xs text-gray-600">{uploadMsg}</p>}
            </form>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700">Browser Notifications</label>
              <p className="mt-1 text-xs text-gray-500">
                Get notified in your browser when this order's status, payment, or completed work changes.
              </p>
              <button
                onClick={handleEnableNotifications}
                disabled={subscribing}
                className="mt-2 w-full rounded-lg border border-brand-300 bg-brand-50 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
              >
                {subscribing ? 'Enabling…' : '🔔 Enable Notifications for This Order'}
              </button>
              {notifStatus && <p className="mt-2 text-xs text-gray-600">{notifStatus}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
