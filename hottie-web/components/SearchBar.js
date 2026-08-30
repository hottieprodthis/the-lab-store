import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Función exacta para calcular el precio según el esquema de tu base de datos
function getItemPrice(item) {
  if (!item) return '';

  if (item.price_cents !== undefined && item.price_cents !== null && item.price_cents > 0) {
    const euros = (item.price_cents / 100).toFixed(2).replace('.', ',');
    return `${euros}€`;
  }
  if (item.precio_centimos !== undefined && item.precio_centimos !== null && item.precio_centimos > 0) {
    const euros = (item.precio_centimos / 100).toFixed(2).replace('.', ',');
    return `${euros}€`;
  }

  if (item.price_cents === 0 || item.precio_centimos === 0) {
    return '0,00€';
  }

  const val = item.precio ?? item.price;
  if (typeof val === 'number') {
    return `${val.toFixed(2).replace('.', ',')}€`;
  }
  if (typeof val === 'string' && val.trim()) {
    return val.includes('€') ? val : `${val.trim()}€`;
  }

  return '';
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    async function fetchAllData() {
      if (!supabase) return;
      setLoading(true);
      try {
        let allItems = [];

        const [resProducts, resServices, resItems, resProductos, resServicios] = await Promise.allSettled([
          supabase.from('products').select('*'),
          supabase.from('services').select('*'),
          supabase.from('items').select('*'),
          supabase.from('productos').select('*'),
          supabase.from('servicios').select('*'),
        ]);

        if (resProducts.status === 'fulfilled' && resProducts.value.data) {
          allItems.push(...resProducts.value.data.map(i => ({ ...i, categoryType: 'PRODUCTO' })));
        }
        if (resServices.status === 'fulfilled' && resServices.value.data) {
          allItems.push(...resServices.value.data.map(i => ({ ...i, categoryType: 'SERVICIO' })));
        }
        if (resItems.status === 'fulfilled' && resItems.value.data) {
          allItems.push(...resItems.value.data.map(i => ({ ...i, categoryType: i.type || i.tipo || 'PRODUCTO' })));
        }
        if (resProductos.status === 'fulfilled' && resProductos.value.data) {
          allItems.push(...resProductos.value.data.map(i => ({ ...i, categoryType: 'PRODUCTO' })));
        }
        if (resServicios.status === 'fulfilled' && resServicios.value.data) {
          allItems.push(...resServicios.value.data.map(i => ({ ...i, categoryType: 'SERVICIO' })));
        }

        const uniqueItems = Array.from(new Map(allItems.map(item => [item.id || JSON.stringify(item), item])).values());
        setItems(uniqueItems);
      } catch (err) {
        console.error('Error cargando buscador:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = items.filter(item => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();

    const name = String(item.name || item.nombre || item.title || item.title_es || '').toLowerCase();
    const slug = String(item.slug || '').toLowerCase();
    const type = String(item.type || item.tipo || item.categoryType || '').toLowerCase();

    return name.includes(q) || slug.includes(q) || (q.length > 2 && type.includes(q));
  });

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md lg:max-w-lg mx-2">
      <div className={`relative flex items-center bg-[#111111] rounded-full border transition-all duration-300 ${
        isOpen ? 'border-[#CCFF00] shadow-[0_0_20px_rgba(204,255,0,0.25)]' : 'border-neutral-800 hover:border-neutral-700'
      }`}>
        
        {/* Lupa verde #CCFF00 + Ecualizador animado */}
        <div className="pl-4 text-[#CCFF00] flex items-center gap-2.5 pointer-events-none shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          <div className="flex items-end gap-[3px] h-3.5 pr-2 border-r border-neutral-800">
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_100ms] h-full"></span>
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_300ms] h-2/3"></span>
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_200ms] h-5/6"></span>
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_400ms] h-1/2"></span>
          </div>
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar en el laboratorio..."
          className="w-full bg-transparent py-2.5 pl-2.5 pr-10 text-xs md:text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wide"
        />

        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }} 
            className="absolute right-3 p-1 rounded-full text-neutral-400 hover:text-[#CCFF00]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Resultados desplegables visuales */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-[#0d0d0d] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-900/60 p-2">
            {loading ? (
              <div className="p-4 text-center text-xs text-neutral-500 font-mono animate-pulse">
                Cargando catálogo...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No se encontraron resultados para "<span className="text-[#CCFF00]">{query}</span>"
              </div>
            ) : (
              filtered.map((item) => {
                const title = item.name ?? item.nombre ?? item.title ?? item.slug ?? 'Sin título';
                const rawType = item.type ?? item.tipo ?? item.categoryType ?? 'PRODUCTO';
                const category = String(rawType).toUpperCase();
                const priceFormatted = getItemPrice(item);
                const image = item.image_url ?? item.imagen_url ?? item.image ?? item.imagen;
                const isService = category.includes('SERVICIO');

                const identifier = item.slug || item.id;
                // Redirección arreglada: la tienda va a /tienda/id y servicios va a /servicios
                const itemUrl = isService ? `/servicios` : `/tienda/${identifier}`;

                return (
                  <a
                    key={item.id || Math.random()}
                    href={itemUrl}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-900 transition-all cursor-pointer group block"
                  >
                    <div className="flex items-center gap-3">
                      {image ? (
                        <img src={image} alt={String(title)} className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-bold text-[#CCFF00]">
                          LAB
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-[#CCFF00] transition-colors">{title}</h4>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{category}</span>
                      </div>
                    </div>
                    {priceFormatted ? (
                      <span className="text-xs font-black text-[#CCFF00]">{priceFormatted}</span>
                    ) : null}
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
