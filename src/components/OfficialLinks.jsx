export function OfficialLinks({ links }) {
  const items = (links ?? []).filter((item) => item?.href);
  if (!items.length) return null;
  return (
    <span className="official-links">
      {items.map((item) => (
        <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
          {item.label || item.href}
        </a>
      ))}
    </span>
  );
}
