import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { slugify } from '../lib/format';

export default function ItemForm({ table, initial, hasFileUrl }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const isService = table === 'services';

  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [price, setPrice] = useState(
    initial?.price_cents !== undefined && initial?.price_cents !== null
      ? (initial.price_cents / 100).toString()
      : ''
  );
  const [currency, setCurrency] = useState(initial?.currency || 'eur');
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '');
  const [fileUrl, setFileUrl] = useState(initial?.file_url || '');
  const [demoUrl, setDemoUrl] = useState(initial?.demo_url || '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(isEdit);

  // ESTADO PARA PLANES / CATEGORÍAS (SIN LÍMITE)
  const [plans, setPlans] = useState(initial?.plans || []);

  function handleNameChange(value) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  const addPlan = () => {
    setPlans([...plans, { name: '', price: '', description: '' }]);
  };

  const removePlan = (index) => {
    setPlans(plans.filter((_, i) => i !== index));
  };

  const updatePlan = (index, field, value) => {
    const updated = [...plans];
    updated[index][field] = value;
    setPlans(updated);
  };

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const path = `${table}/${Date.now()}-${slugify(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    setUploading(false);
    if (uploadError) {
      setError('No se ha podido subir la imagen: ' + uploadError.message);
      return;
    }
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    setImageUrl(data.publicUrl);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !slug.trim()) {
      setError('El nombre y el slug son obligatorios.');
      return;
    }

    // Formatear los planes rellenados
    const formattedPlans = plans
      .filter((p) => p.name.trim() !== '')
      .map((p) => ({
        name: p.name.trim(),
        price: p.price !== '' ? parseFloat(p.price) : 0,
        description: p.description ? p.description.trim() : '',
      }));

    // Si hay planes, el precio base será el del plan más económico para tomar de referencia en los listados
    let finalPriceCents = null;
    if (isService && formattedPlans.length > 0) {
      const minPlanPrice = Math.min(...formattedPlans.map((p) => p.price));
      finalPriceCents = Math.round(minPlanPrice * 100);
    } else if (price !== '') {
      finalPriceCents = Math.round(parseFloat(price) * 100);
    }

    const payload = {
      name: name.trim(),
      slug: slugify(slug),
      description,
      price_cents: finalPriceCents,
      currency,
      image_url: imageUrl || null,
      active,
    };

    if (hasFileUrl) {
      payload.file_url = fileUrl || null;
      payload.demo_url = demoUrl || null;
    }
    if (isService) payload.plans = formattedPlans;

    setSaving(true);
    const query = isEdit
      ? supabase.from(table).update(payload).eq('id', initial.id)
      : supabase.from(table).insert(payload);

    const { error: saveError } = await query;
    setSaving(false);

    if (saveError) {
      setError(
        saveError.message.includes('duplicate')
          ? 'Ya existe un elemento con ese slug. Cambia el slug e inténtalo de nuevo.'
          : 'Error al guardar: ' + saveError.message
      );
      return;
    }

    router.push('/admin');
  }

  const hasPlans = isService && plans.length > 0;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && <p className="rounded-sm bg-volt/10 p-3 text-sm text-volt">{error}</p>}

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Nombre</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
          Slug (parte de la URL)
        </label>
        <input
          type="text"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Descripción</label>
        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
            Precio ({currency.toUpperCase()}) {hasPlans ? '— (Gest. por planes)' : '— vacío = "a consultar"'}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            disabled={hasPlans}
            value={hasPlans ? '' : price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={hasPlans ? 'Definido en los planes' : ''}
            className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {hasPlans && (
            <p className="mt-1 text-[11px] text-muted">
              Al existir planes, el precio del plan más bajo se usará como referencia (&quot;Desde X €&quot;).
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
          >
            <option value="eur">EUR (€)</option>
            <option value="usd">USD ($)</option>
            <option value="gbp">GBP (£)</option>
          </select>
        </div>
      </div>

      {/* PLANES / CATEGORÍAS (Solo en Servicios) */}
      {isService && (
        <div className="border-t border-white/15 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-paper">
                Planes / Categorías (Opcional)
              </h3>
              <p className="text-xs text-muted">Añade precios y descripciones específicas por plan.</p>
            </div>
            <button
              type="button"
              onClick={addPlan}
              className="rounded-sm border border-volt/40 bg-volt/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-volt hover:bg-volt hover:text-ink transition"
            >
              + Añadir Plan
            </button>
          </div>

          <div className="space-y-4">
            {plans.map((plan, index) => (
              <div key={index} className="relative rounded-sm border border-white/15 bg-white/5 p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => removePlan(index)}
                  className="absolute top-3 right-3 text-xs font-bold text-red-400 hover:underline uppercase"
                >
                  Eliminar
                </button>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Nombre del Plan</label>
                    <input
                      type="text"
                      required
                      value={plan.name}
                      onChange={(e) => updatePlan(index, 'name', e.target.value)}
                      className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Precio (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={plan.price}
                      onChange={(e) => updatePlan(index, 'price', e.target.value)}
                      className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted">Descripción del Plan</label>
                  <textarea
                    rows={3}
                    value={plan.description}
                    onChange={(e) => updatePlan(index, 'description', e.target.value)}
                    className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
                    placeholder="En el plan..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Imagen</label>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mb-2 h-32 w-32 rounded-sm object-cover" />
        )}
        <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-muted" />
        {uploading && <p className="mt-1 text-xs text-signal">Subiendo…</p>}
      </div>

      {hasFileUrl && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
              Enlace de descarga (se muestra al comprador tras pagar)
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
            />
          </div>

          <div className="border-t border-white/15 pt-4">
            <label className="mb-1 block text-xs uppercase tracking-widest text-volt font-bold">
              URL de Preview / Demo (Spotify, YouTube, SoundCloud o enlace MP3)
            </label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="Ej: https://open.spotify.com/track/... o https://..."
              className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-paper">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Publicado (visible en la web)
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-sm bg-volt px-6 py-3 text-sm font-semibold uppercase tracking-widest text-ink hover:brightness-110 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-sm border border-white/20 px-6 py-3 text-sm uppercase tracking-widest text-paper hover:border-signal hover:text-signal"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
