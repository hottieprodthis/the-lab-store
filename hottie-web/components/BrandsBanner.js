export default function BrandsBanner() {
  const brands = [
    { name: 'Behringer', logo: '/brands/behringer.png' },
    { name: 'Shure', logo: '/brands/shure.png' },
    { name: 'Yamaha', logo: '/brands/yamaha.png' },
    { name: 'American Audio', logo: '/brands/american-audio.png' },
    { name: 'Midas', logo: '/brands/midas.png' },
  ];

  // SVG en código con el texto "EQUIPAMIENTO Y MARCAS CON LAS QUE TRABAJAMOS" en negro puro
  const textSvgBlack = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 20'><text x='50%' y='15' fill='%23000000' font-family='sans-serif' font-size='12' font-weight='bold' text-anchor='middle' letter-spacing='2'>EQUIPAMIENTO Y MARCAS CON LAS QUE TRABAJAMOS</text></svg>";

  return (
    <section className="w-full bg-[#CCFF00] py-10 my-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex justify-center mb-6">
          <img 
            src={textSvgBlack} 
            alt="Equipamiento y marcas con las que trabajamos" 
            className="h-4 w-auto max-w-full pointer-events-none select-none"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
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
