-- @todo: clean this up :^)
return {
	{
		'hrsh7th/nvim-cmp',
		event = 'InsertEnter',
		dependencies = {
			'onsails/lspkind.nvim',
			'hrsh7th/cmp-nvim-lsp',
			'hrsh7th/cmp-path',
			'hrsh7th/cmp-buffer',
			'saadparwaiz1/cmp_luasnip',
			'zbirenbaum/copilot.lua',
			'zbirenbaum/copilot-cmp',
		},
		config = function()
			local cmp = require('cmp')
			require('copilot').setup {
				suggestion = { enabled = false },
				panel = { enabled = false },
			}
			require('copilot_cmp').setup()
			cmp.setup({
				mapping = {
					['<CR>'] = cmp.mapping.confirm({ select = true }),
					['<Tab>'] = cmp.mapping.select_next_item(),
					['<S-Tab>'] = cmp.mapping.select_prev_item(),
				},
				sources = {
					{ name = 'nvim_lsp' },
					{ name = 'buffer' },
					{ name = 'path' },
					{ name = 'copilot' },
				},
				formatting = {
					format = require('lspkind').cmp_format({
						mode = 'symbol_text',
						maxwidth = 50,
					}),
				},
			})
		end,
	}
}
