// Stacked heading + optional note (the old split headline/side-note layout is retired).
export default function SectionHeading({ title, note, eyebrow }) {
  return (
    <header className="section-heading">
      {eyebrow && <span className="eyebrow mono">{eyebrow}</span>}
      <h2 className="section-title">{title}</h2>
      {note && <p className="section-note">{note}</p>}
    </header>
  );
}
