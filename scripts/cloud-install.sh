#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Sistema-de-Reservas-Citas-en-L-nea
source scripts/cloud-env.sh
# This source build uses Prisma's exact engine revision when the binary CDN is unavailable.
if [ ! -x /workspace/.toolchains/prisma/schema-engine-6.19.0 ]; then
  mkdir -p /workspace/.toolchains /workspace/.sources
  curl --fail --location --silent --show-error https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init -o /workspace/.toolchains/rustup-init
  curl --fail --location --silent --show-error https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init.sha256 -o /workspace/.toolchains/rustup-init.sha256
  (cd /workspace/.toolchains && sha256sum -c rustup-init.sha256)
  chmod +x /workspace/.toolchains/rustup-init
  export RUSTUP_HOME=/workspace/.toolchains/rustup CARGO_HOME=/workspace/.toolchains/cargo
  /workspace/.toolchains/rustup-init -y --no-modify-path --profile minimal --default-toolchain none
  /workspace/.toolchains/cargo/bin/rustup toolchain install 1.90.0 --profile minimal
  if [ ! -d /workspace/.sources/prisma-engines/.git ]; then
    git clone --depth 1 --branch 6.19.0 https://github.com/prisma/prisma-engines.git /workspace/.sources/prisma-engines
  fi
  test "$(git -C /workspace/.sources/prisma-engines rev-parse HEAD)" = 2ba551f319ab1df4bc874a89965d8b3641056773
  (cd /workspace/.sources/prisma-engines && /workspace/.toolchains/cargo/bin/cargo +1.90.0 build --locked --release -p schema-engine-cli -j 4)
  mkdir -p /workspace/.toolchains/prisma
  cp /workspace/.sources/prisma-engines/target/release/schema-engine /workspace/.toolchains/prisma/schema-engine-6.19.0
fi
export PRISMA_SCHEMA_ENGINE_BINARY=/workspace/.toolchains/prisma/schema-engine-6.19.0
"$PRISMA_SCHEMA_ENGINE_BINARY" --version
pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store
node scripts/setup-local.mjs
docker compose up -d --wait mysql
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build
