import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <div className="eyebrow">SHIN Node</div>
          <h1>Page Not Found</h1>
          <p className="muted">The requested SHIN page or module route is not available on this node.</p>
        </div>
        <Link className="button" href="/modules">
          Module Registry
        </Link>
      </header>
    </div>
  );
}
