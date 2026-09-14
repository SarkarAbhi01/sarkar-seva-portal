import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

const emptyForm = {
  title: '', tagline: '', description: '', category: '',
  iconUrl: '', imageUrl: '', price: '', estimatedDays: '',
  requiredDocsText: '', termsAndNotes: '',
};

export default function ServiceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/services/${id}`).then((res) => {
      const s = res.data.service;
      setForm({
        title: s.title, tagline: s.tagline || '', description: s.description,
        category: s.category || '', iconUrl: s.iconUrl || '', imageUrl: s.imageUrl || '',
        price: s.price, estimatedDays: s.estimatedDays || '',
        requiredDocsText: Array.isArray(s.requiredDocs) ? s.requiredDocs.join('\n') : '',
        termsAndNotes: s.termsAndNotes || '',
      });
    });
  }, [id, isEdit]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      tagline: form.tagline,
      description: form.description,
      category: form.category,
      iconUrl: form.iconUrl,
      imageUrl: form.imageUrl,
      price: parseFloat(form.price),
      estimatedDays: form.estimatedDays ? parseInt(form.estimatedDays, 10) : undefined,
      requiredDocs: form.requiredDocsText.split('\n').map((s) => s.trim()).filter(Boolean),
      termsAndNotes: form.termsAndNotes,
    };

    try {
      if (isEdit) {
        await api.patch(`/services/${id}`, payload);
        toast.success('Service updated.');
      } else {
        await api.post('/services', payload);
        toast.success('Service created as draft. Publish it to make it public.');
      }
      navigate('/admin/services');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Service' : 'New Service'}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <Field label="Title" required value={form.title} onChange={handleChange('title')} />
        <Field label="Tagline" value={form.tagline} onChange={handleChange('tagline')} />
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={handleChange('description')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" value={form.category} onChange={handleChange('category')} />
          <Field label="Price (INR)" type="number" required value={form.price} onChange={handleChange('price')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Icon (emoji or URL)" value={form.iconUrl} onChange={handleChange('iconUrl')} />
          <Field label="Estimated Days" type="number" value={form.estimatedDays} onChange={handleChange('estimatedDays')} />
        </div>
        <Field label="Image URL" value={form.imageUrl} onChange={handleChange('imageUrl')} />
        <div>
          <label className="text-sm font-medium text-gray-700">Required Documents (one per line)</label>
          <textarea
            rows={3}
            value={form.requiredDocsText}
            onChange={handleChange('requiredDocsText')}
            placeholder={'Aadhaar Card\nPassport Photo'}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Terms & Notes</label>
          <textarea
            rows={3}
            value={form.termsAndNotes}
            onChange={handleChange('termsAndNotes')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
          </button>
          <button type="button" onClick={() => navigate('/admin/services')} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
    </div>
  );
}
