// Run before external hosting builds. Never print environment values.
export function missingBuildSettings(env) {
  return ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(name => !env[name]?.trim());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const missing = missingBuildSettings(process.env);
  if (missing.length) {
    console.error(`Build stopped: missing connection settings: ${missing.join(", ")}. Add them to the hosting project's Production environment, then rebuild. Private keys must never have a VITE_ prefix.`);
    process.exitCode = 1;
  } else {
    console.log("Public build connection settings are present. Server settings must also be configured at runtime.");
  }
}