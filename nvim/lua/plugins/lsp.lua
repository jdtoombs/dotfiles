return {
	'VonHeikemen/lsp-zero.nvim',
	branch = 'v4.x',
	event = { 'BufReadPre', 'BufNewFile' },
	dependencies = {
		'neovim/nvim-lspconfig',
		"williamboman/mason.nvim",
		"williamboman/mason-lspconfig.nvim",
	},

	config = function()
		local lsp_zero = require('lsp-zero')

		lsp_zero.on_attach(function(_, bufnr)
			lsp_zero.default_keymaps({ buffer = bufnr })
		end)

		require('mason').setup({})
		require('mason-lspconfig').setup({
			ensure_installed = { 'lua_ls', 'rust_analyzer' },
			handlers = {
				function(server_name)
					require('lspconfig')[server_name].setup({})
				end,
			},
		})
	end,
}
