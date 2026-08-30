import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

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

        if (resProducts.status === 'fulfilled' && resProducts.value.data) allItems.push(...resProducts.value.data);
        if (resServices.status === 'fulfilled' && resServices.value.data) allItems.push(...resServices.value.data);
        if (resItems.status === 'fulfilled' && resItems.value.data) allItems.push(...resItems.value.data);
        if (resProductos.status === 'fulfilled' && resProductos.value.data) allItems.push(...resProductos.value.data);
        if (resServicios.status === 'fulfilled' && resServicios.value.data) allItems.push(...resServicios.value.data);

        const uniqueItems = Array.from(new Map(allItems.map(item => [item.id || JSON.stringify(item), item])).values());
        setItems(uniqueItems);
      } catch (err) {
        console.error('Error:', err);
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
    const strData = JSON.stringify(item).toLowerCase();
    return strData.includes(q);
  });

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md lg:max-w-lg mx-2">
      <div className={`relative flex items-center bg-[#111111] rounded-full border transition-all duration-300 ${
        isOpen ? 'border-[#CCFF00] shadow-[0_0_20px_rgba(204,255,0,0.25)]' : 'border-neutral-800 hover:border-neutral-700'
      }`}>
        <div className="pl-4 text-[#CCFF00] flex items-center gap-2.5 pointer-events-none shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar..."
          className="w-full bg-transparent py-2.5 pl-2.5 pr-10 text-xs text-white placeholder-neutral-500 focus:outline-none"
        />
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-[#0d0d0d] border border-neutral-800 rounded-2xl shadow-2xl p-3 z-50 text-left">
          {filtered.map((item, idx) => (
            <div key={idx} className="p-2 mb-2 bg-neutral-900 rounded-lg text-[11px] font-mono text-green-400 break-all">
              <strong>DATOS RECIBIDOS:</strong>
              <pre className="text-white mt-1 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
