import { formatPrice } from '../lib/format';

export default function ServiceCard({ service }) {
  return (
    <div className="flex flex-col justify-between rounded-sm border border-white/10 bg-surface p-6 transition hover:border-signal/60">
      <div>
        <h3 className="font-display text-2xl tracking-wide text-paper">{service.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-volt">
          {service.price_cents ? formatPrice(service.price_cents, service.currency) : 'A consultar'}
        </span>
        <a
          href="/contacto"
          className="rounded-sm border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal"
        >
          Reservar
        </a>
      </div>
    </div>
  );
}
