"use client";

import { useId, useState } from "react";

/**
 * Filters the rows already rendered in a table by patient name, entirely in the browser.
 * Names never go into the URL or to the server: the GET filter form only carries the case
 * reference. Only rows on the current page are searched.
 */
export function NameFilter({ tableId, total }: { tableId: string; total: number }) {
  const id = useId();
  const [shown, setShown] = useState(total);
  const [query, setQuery] = useState("");
  const apply = (value: string) => {
    setQuery(value);
    const q = value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll<HTMLTableRowElement>(`#${tableId} tbody tr[data-search]`).forEach((tr) => {
      const match = !q || (tr.dataset.search ?? "").includes(q);
      tr.hidden = !match;
      if (match) n++;
    });
    setShown(n);
  };
  return (
    <div className="field" style={{ maxWidth: 360 }}>
      <label htmlFor={id}>Find a patient on this page</label>
      <p className="hint" id={`${id}-hint`}>
        Matches names in the rows below without sending them anywhere.
      </p>
      <input
        id={id}
        className="input"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => apply(e.target.value)}
        aria-describedby={`${id}-hint ${id}-count`}
      />
      <p id={`${id}-count`} className="hint" aria-live="polite">
        {query ? `${shown} of ${total} rows match.` : ""}
      </p>
    </div>
  );
}
