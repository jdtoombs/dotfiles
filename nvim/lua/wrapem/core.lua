local M = {}

local options = {
  ["("] = ")",
  ["{"] = "}",
  ["["] = "]",
  ["<"] = ">",
  ["\""] = "\"",
  ["`"] = "`",

}

function M.wrap_word_with()
  local char = vim.fn.nr2char(vim.fn.getchar())
  local close_with = options[char]
  if not close_with then
    local valid_keys = nil
    for key in pairs(options) do
      valid_keys = valid_keys and valid_keys .. ", " .. key or key
    end
    print("Valid keys are: " .. valid_keys)
    return
  end

  local word = vim.fn.expand('<cword>')
  if word ~= '' then
    vim.cmd('normal! ciw' .. char .. word .. close_with)
  end
end

M.setup = function()
  vim.api.nvim_set_keymap("n", "<leader>w", ":lua require'wrapem.core'.wrap_word_with()<CR>",
    { noremap = true, silent = true })
end

return M
