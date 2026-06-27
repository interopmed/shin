type FoundationPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: {
    label: string;
    value: string;
    detail: string;
  }[];
  sections: {
    title: string;
    body: string;
  }[];
};

export function FoundationPage({ eyebrow, title, description, stats, sections }: FoundationPageProps) {
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </header>

      <section className="grid cols-3">
        {stats.map((stat) => (
          <div className="panel stat" key={stat.label}>
            <span className="muted">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
            <span className="muted">{stat.detail}</span>
          </div>
        ))}
      </section>

      <section className="grid cols-2">
        {sections.map((section) => (
          <div className="panel" key={section.title}>
            <h2>{section.title}</h2>
            <p className="muted">{section.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
