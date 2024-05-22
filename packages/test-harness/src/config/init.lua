local temp_dir = os.getenv('TEMP_DIR')
local repo_root = os.getenv('CURSORLESS_REPO_ROOT')

vim.cmd('source ' .. temp_dir .. '/BufOnly.vim/plugin/BufOnly.vim')

vim.o.runtimepath = vim.o.runtimepath .. ',' .. temp_dir .. '/talon.nvim'
vim.o.runtimepath = vim.o.runtimepath .. ',' .. repo_root .. '/dist/cursorless.nvim'

require('talon').setup()
require('cursorless').setup()
