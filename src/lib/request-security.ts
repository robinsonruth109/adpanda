import 'server-only';
/** Reject cross-site cookie-authenticated mutations. Browsers send Origin for fetch/form POSTs. */
export function isTrustedMutation(request: Request): boolean {
  const origin=request.headers.get('origin');
  if (!origin) return false;
  try {
    const parsed=new URL(origin);
    const host=request.headers.get('x-forwarded-host') || request.headers.get('host');
    return !!host && parsed.host.toLowerCase()===host.toLowerCase() &&
      (parsed.protocol==='https:' || (process.env.NODE_ENV!=='production' && parsed.protocol==='http:'));
  } catch { return false; }
}
