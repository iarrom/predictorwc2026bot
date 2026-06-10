export function getEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}
