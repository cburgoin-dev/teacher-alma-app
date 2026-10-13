export const diagnosticDevUserId = '6ac0de00-0000-4000-8000-000000090001';
export function diagnosticDevEnabled(environment: string | undefined, databaseUrl: string | undefined) {
  try {
    const url = new URL(databaseUrl ?? '');
    return environment === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && url.pathname === '/teacher_alma_dev';
  } catch { return false; }
}
