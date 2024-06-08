#!/usr/bin/env bash
set -euo pipefail

# TODO: Actually use this script locally

in_dir=../../cursorless.nvim
out_dir=../../dist/cursorless.nvim

mkdir -p "$out_dir/node"

# TODO: Can we avoid all this manual copying and just copy the whole directory?
# copy .lua and .vim dependencies as well as other static files
cp -r "$in_dir/README.md" "$out_dir/"
cp -r "$in_dir/lua" "$out_dir/"
cp -r "$in_dir/vim" "$out_dir/"
cp -r "$in_dir/node/command-server" "$out_dir/node/"

# copy the built .js file
ln -sf "$(pwd)" "$out_dir/node/cursorless-neovim"
