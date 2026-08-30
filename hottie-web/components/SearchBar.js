import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';

export default function SearchBar({ catalog = [] }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = catalog.filter(item => 
    item.title?.toLowerCase().includes(query.toLowerCase()) ||
    item.subcategory?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md lg:max-w-lg mx-2">
      <div className={`relative flex items-center bg-[#111111] rounded-full border transition-all duration-300 ${
        isOpen ? 'border-[#CCFF00] shadow-[0_0_20px_rgba(204,255,0,0.25)]' : 'border-neutral-800 hover:border-neutral-700'
      }`}>
        
        {/* Lupa verde #CCFF00 + Onda ecualizadora animada integradas */}
        <div className="pl-4 text-[#CCFF00] flex items-center gap-2.5 pointer-events-none shrink-0">
          <Search className="w-4 h-4 text-[#CCFF00]" />
          
          <div className="flex items-end gap-[3px] h-3.5 pr-2 border-r border-neutral-800">
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_100ms] h-full"></span>
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_300ms] h-2/3"></span>
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_200ms] h-5/6"></span>
            <span className="w-[2px] bg-[#CCFF00] rounded-full animate-[bounce_1s_infinite_400ms] h-1/2"></span>
          </div>
        </div>

        {/* Texto limpio y profesional */}
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
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Resultados desplegables */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-[#0d0d0d] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-900/60 p-2">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No se encontraron resultados para "<span className="text-[#CCFF00]">{query}</span>"
              </div>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-900 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt={item.title} className="w-9 h-9 rounded-lg object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white hover:text-[#CCFF00]">{item.title}</h4>
                      <span className="text-[10px] text-neutral-400">{item.subcategory}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#CCFF00]">{item.price}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
