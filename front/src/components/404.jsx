import './404.css';

function NotFound() {
  return (
    <main className="not-found-page" aria-labelledby="not-found-title">
      <section className="not-found-card">
        <div className="not-found-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M12 20h22v12a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8V20Z" />
            <path d="M34 23h2a5 5 0 0 1 0 10h-3M18 14c0-2 2-2 2-4m7 4c0-2 2-2 2-4" />
            <path d="M10 42h28" />
          </svg>
        </div>

        <p className="not-found-eyebrow">Café del L · página no encontrada</p>
        <h1 id="not-found-title">404</h1>
        <h2>¡Ups! Esta página se perdió en el camino.</h2>
        <p className="not-found-message">
          Puede que el enlace haya cambiado o que la dirección esté mal escrita.
          Volvamos al menú principal.
        </p>
        <a className="not-found-home" href="/">
          Volver al inicio
          <span aria-hidden="true">→</span>
        </a>
      </section>
    </main>
  );
}

export default NotFound;