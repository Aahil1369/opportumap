// Newest request wins. Take an id with next() before each request; when its answer arrives,
// apply it only if isCurrent(id) — a slower, older answer (typing "t", "to", "tor") is dropped.
//
//   const latest = createLatest();
//   const id = latest.next();
//   const rows = await fetchRows(q);
//   if (latest.isCurrent(id)) setRows(rows);

export function createLatest() {
  let current = 0;
  return {
    next() {
      current += 1;
      return current;
    },
    isCurrent(id) {
      return current > 0 && id === current;
    },
  };
}
