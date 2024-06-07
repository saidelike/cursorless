# Cursorless in Neovim

This document describes how to get set up to work on the Cursorless neovim plugin.

## Initial setup

### 1. Follow the initial contributor setup guide

Follow the steps in [CONTRIBUTING.md](./CONTRIBUTING.md#initial-setup).

### 2. Get production Cursorless neovim working

Follow the installation steps in [cursorless.nvim](https://github.com/hands-free-vim/cursorless.nvim/tree/main#prerequisites).

Confirm that production cursorless.nvim is working in neovim, eg say `"take first paint"` in a nonempty document.

### 3. Switch to local debug version of cursorless.nvim

You'll need to point your neovim configuration to use manually built plugin instead. You might have to locate where your neovim configuration is.

Disable the production cursorless.nvim by commenting out the line containing `'hands-free-vim/cursorless.nvim'`. Enable the debug cursorless.nvim by adding it to the runtimepath. eg:

```lua
require('lazy').setup({
  ...
  'hands-free-vim/talon.nvim',
  -- production cursorless.nvim
  -- 'hands-free-vim/cursorless.nvim',
  ...
})

-- debug cursorless.nvim
vim.o.runtimepath = vim.o.runtimepath .. "," .. "C:\\path\\to\\cursorless\\dist\\cursorless.nvim"
```

Note that the above path should point to the `dist/cursorless.nvim` directory in your cloned cursorless repository. It may not already exist, but will be created automatically when you first launch the extension in debug mode.

Note also that the above line must appear before the `require('cursorless').setup()` line in your neovim configuration.

### 4. Add nvim executable path to your PATH

On Mac and Linux, this should be done automatically.

On Windows, open the Control Panel, navigate to `User Accounts > User Accounts`. Click on `Change my environment variables`. In the `User variables`, e.g. add the entry `C:\Program Files\Neovim\bin` to your `Path`.

## Running / testing extension locally

In order to test out your local version of the extension or to run unit tests locally, you need to run the extension in debug mode. To do so you need to run the `workbench.action.debug.selectandstart` command in VSCode and then select either "Run neovim extension" or "Run neovim extension tests".

The debug logs are written in `C:\path\to\cursorless\packages\cursorless-neovim\out\nvim_node.log`.

NOTE: This will spawn a standalone nvim instance that is independent of VSCode. Consequently after you're done debugging, you need to close nvim.
