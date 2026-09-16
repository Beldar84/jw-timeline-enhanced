#!/usr/bin/env bash
set -euo pipefail

port_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "${port_dir}/.." && pwd)"

docker run --rm \
  --volume "${repo_dir}:/work" \
  --workdir /work/switch-port \
  devkitpro/devkita64:latest \
  make -j2

test -s "${port_dir}/JW-Timeline.nro"
printf 'Creado: %s\n' "${port_dir}/JW-Timeline.nro"
