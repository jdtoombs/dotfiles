--- Execute lua code on given line
vim.keymap.set('n', '<leader>x', function()
  local line = vim.fn.getline(".") -- Get the current line
  vim.cmd("lua " .. line)          -- Execute the line with :lua
end, { noremap = true, silent = true })

vim.keymap.set('n', '<leader>cd', function()
  local line_diagnostics = vim.diagnostic.get(0, { lnum = vim.fn.line('.') - 1 })

  if #line_diagnostics == 0 then
    print("No diagnostics on the current line.")
    return
  end

  local cursor_col = vim.fn.col('.') - 1
  local best_diagnostic = nil
  for _, diagnostic in ipairs(line_diagnostics) do
    if not best_diagnostic or math.abs(diagnostic.col - cursor_col) < math.abs(best_diagnostic.col - cursor_col) then
      best_diagnostic = diagnostic
    end
  end

  if best_diagnostic then
    local message = best_diagnostic.message
    vim.fn.setreg('+', message)
    print("Copied diagnostic to clipboard: " .. message)
  else
    print("No matching diagnostic found.")
  end
end, { noremap = true, silent = true })


-- todo multi line in visual mode
vim.api.nvim_create_user_command('ActiveFormatter', function()
  local clients = vim.lsp.get_clients({ bufnr = 0 })
  for _, client in ipairs(clients) do
    if client.server_capabilities.documentFormattingProvider then
      print("Formatter:", client.name)
    else
      print("No formatter found for " .. client.name)
    end
  end
end, {})
