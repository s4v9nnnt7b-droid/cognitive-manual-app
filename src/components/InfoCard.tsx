export function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="info-card">
      <h3>{title}</h3>
      <div>{children}</div>
    </article>
  );
}
