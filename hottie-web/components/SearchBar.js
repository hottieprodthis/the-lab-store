import React, { useState, useEffect, useRef } from 'react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  // Obtener productos y servicios desde Supabase al montar el componente
  useEffect(() => {
    async function fetchCatalog() {
      setLoading(true);
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) return;

        // Petición a la API REST de Supabase para traer los items
        const res = await fetch(`${supabaseUrl}/rest/v1/items?select=*`, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error('Error cargando el catálogo:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCatalog();
  }, []);

  // Cerrar al hacer clic fuera del buscador
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar productos/servicios por título o categoría/descripción
  const filtered = items.filter(item => {
    const titleMatch = item.title || item.nombre || item.name || '';
    const categoryMatch = item.category || item.categoria || item.subcategory || '';
    const q = query.toLowerCase();

    return titleMatch.toLowerCase().includes(q) || categoryMatch.toLowerCase().includes(q);
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

        {/* Campo de texto */}
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

      {/* Menú desplegable de resultados */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-[#0d0d0d] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-900/60 p-2">
            {loading ? (
              <div className="p-4 text-center text-xs text-neutral-500 font-mono animate-pulse">
                Cargando productos...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No se encontraron resultados para "<span className="text-[#CCFF00]">{query}</span>"
              </div>
            ) : (
              filtered.map((item) => {
                const title = item.title || item.nombre || item.name;
                const category = item.category || item.categoria || item.type || 'Ítem';
                const price = item.price || item.precio;
                const image = item.image || item.image_url || item.imagen;

                return (
                  <a
                    key={item.id}
                    href={category.toLowerCase().includes('servicio') ? `/servicios#${item.id}` : `/tienda#${item.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-900 transition-all cursor-pointer group block"
                  >
                    <div className="flex items-center gap-3">
                      {image ? (
                        <img src={image} alt={title} className="w-9 h-9 rounded-lg object-cover" />
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
                    {price && <span className="text-xs font-black text-[#CCFF00]">{price}€</span>}
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
