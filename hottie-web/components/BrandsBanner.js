export default function BrandsBanner() {
  const brands = [
    { name: 'Behringer', logo: '/brands/behringer.svg' },
    { name: 'Shure', logo: '/brands/shure.svg' },
    { name: 'Yamaha', logo: '/brands/yamaha.svg' },
    { name: 'American Audio', logo: '/brands/american-audio.svg' },
  ];

  return (
    <section className="w-full bg-volt py-10 my-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-ink/70 mb-6">
          Equipamiento y marcas con las que trabajamos
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {brands.map((brand) => (
            <div key={brand.name} className="flex items-center justify-center">
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-8 md:h-10 object-contain brightness-0"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
