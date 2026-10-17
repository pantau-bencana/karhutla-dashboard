import { termHref } from "../lib/route.js";

export function Term({ id, children }) {
  return (
    <a className="term" href={termHref(id)}>
      {children}
    </a>
  );
}
