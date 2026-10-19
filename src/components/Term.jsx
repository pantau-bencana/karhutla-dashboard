import { GLOSSARY } from "../lib/glossary.js";
import { termHref } from "../lib/route.js";

export function Term({ id, children }) {
  const item = GLOSSARY.find((entry) => entry.id === id);
  const title = item ? `${item.istilah}. ${item.penjelasan}` : id;
  return (
    <a className="term" href={termHref(id)} title={title}>
      {children}
    </a>
  );
}
