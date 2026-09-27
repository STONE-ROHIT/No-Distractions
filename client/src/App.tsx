// Temporary placeholder for Phase 1 (Foundation).
//
// This only exists to prove the toolchain works end-to-end: Vite dev
// server, React 19, TypeScript, Tailwind CSS, ESLint and Vitest all
// wired together correctly. The real landing page (with an intentional
// design system — palette, type scale, layout) is built in a later
// phase; see docs/01-project-overview for the product direction.
function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center text-neutral-100">
      <p className="text-sm font-medium tracking-wide text-neutral-500">No Distractions</p>
      <h1 className="text-3xl font-semibold text-balance">
        Learn from YouTube. Without the distractions.
      </h1>
      <p className="max-w-md text-sm text-neutral-400">
        Phase 1 foundation build — client, server, and tooling are wired up. The learning experience
        itself starts in Phase 3.
      </p>
    </main>
  );
}

export default App;
