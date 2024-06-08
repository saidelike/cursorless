#!/usr/bin/env bash
set -euo pipefail

# TODO: Actually use this script locally

out_dir=../../dist/cursorless.nvim
mkdir -p "$out_dir/node"

ln -sf "$(pwd)" "$out_dir/node/test-harness"
