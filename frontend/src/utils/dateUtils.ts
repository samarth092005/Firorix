/**
 * Shared date/time formatting helpers for the Fiorify UI.
 */

export function formatRelativeTime(isoString: string): string {
  try {
    const now = Date.now();
    const past = new Date(isoString).getTime();
    if (Number.isNaN(past)) return 'Recent';
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}
