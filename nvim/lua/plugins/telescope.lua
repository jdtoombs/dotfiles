return {
	'nvim-telescope/telescope.nvim',
	tag = '0.1.8',
	dependencies = { 'nvim-lua/plenary.nvim', { 'nvim-telescope/telescope-fzf-native.nvim', build = 'make' } },
	config = function()
		require('telescope').setup({
			extensions = {
				fzf = {},
			},
		})
		require('telescope').load_extension('fzf')
		local builtin = require('telescope.builtin')
		vim.keymap.set('n', '<leader>pf', builtin.find_files, {})
		vim.keymap.set('n', '<leader>ps', builtin.live_grep, {})
		vim.keymap.set('n', '<leader>nc', function()
			builtin.find_files({
				prompt_title = 'Neovim Config',
				cwd = vim.fn.stdpath('config'),
			})
		end, {})
		vim.keymap.set('n', '<leader>fh', builtin.help_tags, {})
	end,
}
