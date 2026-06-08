return {
  dir = vim.fn.stdpath('config') .. '/lua/claude_query',
  name = 'claude-query',
  config = function()
    local claude_query = require('claude_query')
    
    -- Set keymap for visual line mode (V)
    vim.keymap.set('x', '<leader>c', function()
      claude_query.query_claude()
    end, { desc = 'Query Claude with visual line selection' })
    
    -- Also create a command as backup
    vim.api.nvim_create_user_command('ClaudeQuery', function()
      claude_query.query_claude()
    end, { range = true })
    
  end
}