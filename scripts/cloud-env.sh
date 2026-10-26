# Source this file in this cloud workspace before pnpm/Prisma commands.
export XDG_DATA_HOME=/workspace/.cache/pnpm-data
export XDG_CACHE_HOME=/workspace/.cache
export pnpm_config_store_dir=/workspace/.pnpm-store
export EXPO_NO_TELEMETRY=1
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium
if [ -x /workspace/.toolchains/prisma/schema-engine-6.19.0 ]; then
  export PRISMA_SCHEMA_ENGINE_BINARY=/workspace/.toolchains/prisma/schema-engine-6.19.0
fi
