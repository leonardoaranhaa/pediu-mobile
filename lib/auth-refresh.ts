/**
 * Decides when cached data must be fetched again because a different person is
 * now signed in. `previous` is undefined until the first session check finishes:
 * that first answer only sets the baseline, so opening the app does not refetch
 * everything twice.
 */
export function signedInUserChanged(previous: number | null | undefined, next: number | null) {
  if (previous === undefined) return false;
  return previous !== next;
}
