return {
	'christoomey/vim-tmux-navigator',
	init = function()
		vim.g.tmux_navigator_no_mappings = 1 -- Disable all default mappings
	end,
	config = function()
		-- Re-add the mappings you want, leaving <C-h> unbound
		vim.keymap.set('n', '<C-l>', ':TmuxNavigateRight<CR>', { noremap = true, silent = true })
		vim.keymap.set('n', '<C-j>', ':TmuxNavigateDown<CR>', { noremap = true, silent = true })
		vim.keymap.set('n', '<C-k>', ':TmuxNavigateUp<CR>', { noremap = true, silent = true })
	end,
}
