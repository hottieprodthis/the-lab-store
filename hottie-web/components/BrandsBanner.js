export default function BrandsBanner() {
  const brands = [
    { name: 'Behringer', logo: '/brands/behringer.png' },
    { name: 'Shure', logo: '/brands/shure.png' },
    { name: 'Yamaha', logo: '/brands/yamaha.png' },
    { name: 'American Audio', logo: '/brands/american-audio.png' },
    { name: 'Midas', logo: '/brands/midas.png' },
    { name: 'Arturia', logo: '/brands/arturia.png' },
    { name: 'FL Studio', logo: '/brands/fl-studio.png' },
    { name: 'Moises', logo: '/brands/moises.png' },
    { name: 'Native Instruments', logo: '/brands/native-instruments.png' },
  ];

  return (
    <section className="w-full bg-[#CCFF00] py-10 my-12">
      <div className="mx-auto max-w-7xl px-6">
        <p 
          className="text-center text-xs font-bold uppercase tracking-widest text-black mb-6"
          style={{ 
            color: '#000000', 
            WebkitTextFillColor: '#000000',
            forcedColorAdjust: 'none',
            colorScheme: 'only light'
          }}
        >
          Equipamiento y marcas con las que trabajamos
        </p>
        <div className="mx-auto flex max-w-[920px] flex-wrap items-center justify-center gap-x-8 gap-y-6 md:gap-x-16 md:gap-y-8">
          {brands.map((brand) => (
            <div key={brand.name} className="flex items-center justify-center">
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
