import { Heart, Star } from "lucide-react";

function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-700">
            Mode A
          </p>
          <h1 className="text-2xl font-semibold tracking-normal">
            Shaderwave Studio
          </h1>
        </div>
        <nav className="flex items-center gap-2" aria-label="Project links">
          <a
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600"
            href={__REPO_URL__}
            target="_blank"
            rel="noreferrer"
          >
            <Star aria-hidden="true" size={18} />
            Star
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 shadow-sm hover:border-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600"
            href={__PAYPAL_URL__}
            target="_blank"
            rel="noreferrer"
          >
            <Heart aria-hidden="true" size={18} />
            Support
          </a>
        </nav>
      </header>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="max-w-3xl text-lg text-slate-700">
            Drop an MP3, map FFT bands into a WebGPU shader, and export a short
            MP4 without sending audio to a server.
          </p>
          <dl className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-950">Version</dt>
              <dd>{__APP_VERSION__}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950">Commit</dt>
              <dd>{__APP_COMMIT__}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950">Live mode</dt>
              <dd>GitHub Pages, browser-only</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}

export default App;
