return {
	'mfussenegger/nvim-lint',
	config = function()
		require('lint').linters_by_ft = {
			lua = { 'luacheck' },
			sh = { 'shellcheck' },
			markdown = { 'markdownlint' },
			vim = { 'vint' },
			typescript = { 'eslint_d' },
			javascript = { 'eslint_d' },
		}
	end
}
