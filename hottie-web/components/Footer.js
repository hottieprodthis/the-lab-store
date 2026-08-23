export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center">
        <div className="waveform" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <p className="text-xs uppercase tracking-widest text-muted">
          © {new Date().getFullYear()} The Lab — Hottie · Salamanca, España
        </p>
      </div>
    </footer>
  );
}
