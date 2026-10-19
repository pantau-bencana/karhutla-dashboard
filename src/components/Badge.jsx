export function Badge({ kind = "tau", children }) {
  return (
    <span className={`badge badge-${kind}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}
