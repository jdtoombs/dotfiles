return {
  'kristijanhusak/vim-dadbod-ui',
  dependencies = {
    { 'tpope/vim-dadbod',                     lazy = true },
    { 'kristijanhusak/vim-dadbod-completion', ft = { 'sql', 'mysql', 'plsql' }, lazy = true }, -- Optional
  },
  cmd = {
    'DBUI',
    'DBUIToggle',
    'DBUIAddConnection',
    'DBUIFindBuffer',
  },
  init = function()
    vim.g.db_ui_use_nerd_fonts = 1

    -- Optional local DB connection. Keep the full connection string in your environment,
    -- not in git.
    local db_url = vim.fn.getenv('NVIM_DADBOD_URL')
    if type(db_url) == 'string' and db_url ~= '' and db_url ~= vim.NIL then
      vim.g.dbs = {
        {
          name = 'Local DB',
          url = db_url,
        },
      }
    end
  end,
}
