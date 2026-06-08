return {
	'nvim-treesitter/nvim-treesitter',
	build = ':TSUpdate',
	event = { 'BufReadPost', 'BufNewFile' },
	dependencies = { 'windwp/nvim-ts-autotag' },
	opts = {
		autotag = {
			enable = true,
		},
		ensure_installed = { "javascript", "typescript", "c", "lua", "vim", "vimdoc", "query", "python", "rust", "jsx", "tsx", "html" },
		sync_install = false,
		auto_install = false,
		highlight = {
			enable = true,
			additional_vim_regex_highlighting = false,
		},
	}
}
