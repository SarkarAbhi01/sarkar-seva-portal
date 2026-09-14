import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { loadRazorpayScript } from '../../utils/razorpay';
import { subscribeOrderToPush } from '../../utils/push';

export default function OrderPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [notifStatus, setNotifStatus] = useState('');

  useEffect(() => {
    api.get(`/public/services/${serviceId}`).then((res) => setService(res.data.service)).catch(() => {});
  }, [serviceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/public/orders', { serviceId, ...form });
      setPlacedOrder({ ...data.order, documentUploadToken: data.documentUploadToken });
      toast.success('Order placed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Could not load payment gateway. Please check your connection.');
        return;
      }

      const { data } = await api.post('/public/payments/create-order', { orderId: placedOrder.id });

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: service?.title || 'Seva Portal',
        description: `Payment for order ${placedOrder.orderNumber}`,
        order_id: data.razorpayOrderId,
        prefill: { name: form.customerName, email: form.customerEmail, contact: form.customerPhone },
        handler: async (response) => {
          try {
            await api.post('/public/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPaid(true);
            toast.success('Payment successful!');
          } catch {
            toast.error('Payment verification failed. Please contact support if the amount was deducted.');
          }
        },
        theme: { color: '#2563eb' },
      });

      rzp.on('payment.failed', () => toast.error('Payment failed. You can try again.'));
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Online payment is currently unavailable.');
    } finally {
      setPaying(false);
    }
  };

  const handleEnableNotifications = async () => {
    setSubscribing(true);
    setNotifStatus('');
    const result = await subscribeOrderToPush(placedOrder.id, placedOrder.documentUploadToken);
    setNotifStatus(
      result.subscribed
        ? "You'll get browser notifications when this order updates."
        : result.error || 'Could not enable notifications.'
    );
    setSubscribing(false);
  };

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8">
          <p className="text-4xl">✅</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Order Placed!</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your order number is <span className="font-mono font-semibold">{placedOrder.orderNumber}</span>.
            Save this to track your order status.
          </p>

          {placedOrder.documentUploadToken && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-xs font-semibold text-amber-800">
                Document Upload Token (shown only once — save it!)
              </p>
              <p className="mt-1 break-all rounded bg-white px-2 py-1.5 font-mono text-xs text-gray-800">
                {placedOrder.documentUploadToken}
              </p>
              <p className="mt-2 text-xs text-amber-700">
                You'll need this token along with your order number to upload documents later on the Track Order page.
              </p>
            </div>
          )}

          {paid ? (
            <p className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              ✅ Payment received
            </p>
          ) : (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="mt-4 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {paying ? 'Opening payment…' : 'Pay Now'}
            </button>
          )}

          <button
            onClick={handleEnableNotifications}
            disabled={subscribing}
            className="mt-3 w-full rounded-lg border border-brand-300 bg-brand-50 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
          >
            {subscribing ? 'Enabling…' : '🔔 Enable Notifications for This Order'}
          </button>
          {notifStatus && <p className="mt-2 text-xs text-gray-500">{notifStatus}</p>}

          <button
            onClick={() => navigate('/track')}
            className="mt-3 w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Track My Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Place Your Order</h1>
      {service && (
        <p className="mt-1 text-sm text-gray-500">
          {service.title} — ₹{Number(service.price).toLocaleString('en-IN')}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input
            required
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={form.customerEmail}
            onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <input
            required
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <button
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Placing Order…' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
