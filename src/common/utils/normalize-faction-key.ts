/**
 * Shared faction key normalization utility.
 * Handles all known v1 and v3 data format variations to ensure consistent
 * faction key resolution across parsing, pairing, and rendering pipelines.
 *
 * Round-trip stable: `normalizeFactionKey(key) === key` for canonical keys
 * (e.g. `D-LC-DC`, `FWL,Marik`), which `resolveFactionRenderStyle` relies on
 * when it re-normalizes an already-extracted key.
 */
export function normalizeFactionKey(raw: string): string {
  if (!raw) return '';

  const withoutHidden = raw.replace(/\s*\(H\)\s*$/i, '').trim();
  let input = withoutHidden || raw;

  // extractBorderStateAffiliation emits disputed keys as "D-LC|DC"
  // (pipe-separated, not dash). Preserve every sub-faction so the key
  // normalizes to "D-LC-DC" instead of collapsing to the first slice.
  const disputedPipeMatch = input.match(/^D-([A-Za-z0-9]+(?:[|,/][A-Za-z0-9]+)+)$/i);
  if (disputedPipeMatch) {
    const subFactions = disputedPipeMatch[1]
      .split(/[,/|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (subFactions.length > 1) {
      return `D-${subFactions.join('-').toUpperCase()}`;
    }
  }

  // Split on comma or pipe, but ignore dividers that are inside parentheses
  // (e.g. the disputed form "D(LC|DC)" must stay intact).
  let dividerIndex = -1;
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if ((ch === ',' || ch === '|') && depth === 0) {
      dividerIndex = i;
      break;
    }
  }
  let beforeDivider = dividerIndex >= 0 ? input.substring(0, dividerIndex).trim() : input.trim();

  const xParenMatch = beforeDivider.match(/^\(X\)$/i);
  if (xParenMatch) {
    return 'X';
  }

  const regionMatch = beforeDivider.match(/^([A-Za-z]+)\|Region\s+\d+$/i);
  if (regionMatch) {
    beforeDivider = regionMatch[1];
  }

  const pipeOnlyMatch = beforeDivider.match(/^([A-Za-z]+)\|.*$/i);
  if (pipeOnlyMatch) {
    beforeDivider = pipeOnlyMatch[1];
  }

  const dashDisputedMatch = beforeDivider.match(/^D-([A-Z0-9]+(?:-[A-Z0-9]+)+)$/i);
  if (dashDisputedMatch) {
    return `D-${dashDisputedMatch[1].toUpperCase()}`;
  }

  const disputedMatch = beforeDivider.match(/^D([A-Z]+)?\(([^)]+)\)$/i);
  if (disputedMatch) {
    const state = disputedMatch[1]?.toUpperCase() ?? 'D';
    const additional = disputedMatch[2];
    const subFactions = additional.split(/[,/|]/).map(s => s.trim()).filter(s => s.length > 0);
    if (subFactions.length > 0) {
      return [state, ...subFactions].join('-');
    }
  }

  const abandonedMatch = beforeDivider.match(/^A\(([^)]+)\)$/i);
  if (abandonedMatch) {
    return abandonedMatch[1].toUpperCase();
  }

  if (beforeDivider.startsWith('[')) {
    const trailingMatch = beforeDivider.match(/([A-Za-z0-9]+)\s*$/);
    if (trailingMatch) {
      return trailingMatch[1].toUpperCase();
    }
    return '';
  }

  return beforeDivider.toUpperCase();
}
