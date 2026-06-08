local M = {}

local function get_visual_line_selection()
  local start_pos = vim.fn.getpos("'<")
  local end_pos = vim.fn.getpos("'>")

  if start_pos[2] == 0 or end_pos[2] == 0 then
    return nil
  end

  local lines = vim.fn.getline(start_pos[2], end_pos[2])
  if #lines == 0 then
    return nil
  end

  return table.concat(lines, '\n')
end

local function get_file_context()
  local filepath = vim.fn.expand('%:p')
  local filename = vim.fn.expand('%:t')
  local filetype = vim.bo.filetype

  return {
    filepath = filepath,
    filename = filename,
    filetype = filetype
  }
end

local function create_popup()
  local width = math.floor(vim.o.columns * 0.8)
  local height = 15
  local row = math.floor((vim.o.lines - height) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  local buf = vim.api.nvim_create_buf(false, true)
  local win = vim.api.nvim_open_win(buf, true, {
    relative = 'editor',
    width = width,
    height = height,
    row = row,
    col = col,
    style = 'minimal',
    border = 'rounded',
    title = ' Claude Query ',
    title_pos = 'center'
  })

  vim.api.nvim_buf_set_lines(buf, 0, -1, false, { '', 'Enter your question for Claude:', '' })
  vim.api.nvim_win_set_cursor(win, { 3, 0 })

  -- Set buffer options for better editing
  vim.api.nvim_buf_set_option(buf, 'modifiable', true)
  vim.api.nvim_buf_set_option(buf, 'buftype', 'nofile')

  -- Defer insert mode to ensure proper focus
  vim.defer_fn(function()
    vim.api.nvim_set_current_win(win)
    vim.api.nvim_win_set_cursor(win, { 3, 0 })
    vim.cmd('startinsert!')
  end, 10)

  return buf, win
end

local function send_to_claude(selection, file_context, prompt, buf, win)
  if not selection or selection == '' then
    return
  end

  if not prompt or prompt == '' then
    return
  end

  local context = string.format("File: %s (%s)\n\nSelected code:\n```%s\n%s\n```\n\nQuestion: %s",
    file_context.filename,
    file_context.filetype,
    file_context.filetype,
    selection,
    prompt
  )

  -- Update popup to show waiting
  local current_lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
  table.insert(current_lines, '')
  table.insert(current_lines, '⏳ Waiting for Claude response...')
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, current_lines)

  -- Check if claude command exists first
  if vim.fn.executable('claude') ~= 1 then
    local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
    for i = #lines, 1, -1 do
      if lines[i]:match('⏳') then
        table.remove(lines, i)
        break
      end
    end
    table.insert(lines, '')
    table.insert(lines, '❌ Error: claude command not found in PATH')
    table.insert(lines, 'Make sure Claude CLI is installed and accessible')
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
    return
  end

  local response_lines = {}
  local job_id = vim.fn.jobstart({ 'claude', '-p' }, {
    on_exit = function(_, exit_code)
      -- Remove waiting message
      local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
      for i = #lines, 1, -1 do
        if lines[i]:match('⏳') then
          table.remove(lines, i)
          break
        end
      end

      if exit_code == 0 and #response_lines > 0 then
        table.insert(lines, '')
        table.insert(lines, '✅ Claude Response:')
        table.insert(lines, '')
        for _, line in ipairs(response_lines) do
          table.insert(lines, line)
        end
      else
        table.insert(lines, '')
        table.insert(lines, '❌ Claude query failed')
      end

      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
    end,
    on_stdout = function(_, data)
      if data then
        for _, line in ipairs(data) do
          if line and line ~= '' then
            table.insert(response_lines, line)
          end
        end
      end
    end,
    stdout_buffered = true,
    stderr_buffered = true
  })

  -- Send the context via stdin
  if job_id > 0 then
    vim.fn.chansend(job_id, context)
    vim.fn.chanclose(job_id, 'stdin')
  end
end

function M.query_claude()
  local selection = get_visual_line_selection()
  if not selection then
    vim.notify('Please select lines in visual line mode first', vim.log.levels.WARN)
    return
  end

  local file_context = get_file_context()
  local buf, win = create_popup()

  local function submit()
    local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
    local prompt = ''

    for i = 3, #lines do
      if lines[i] and lines[i] ~= '' and not lines[i]:match('⏳') and not lines[i]:match('✅') then
        prompt = lines[i]
        break
      end
    end

    send_to_claude(selection, file_context, prompt, buf, win)
  end

  local function cancel()
    vim.api.nvim_win_close(win, true)
  end

  vim.keymap.set('n', '<CR>', submit, { buffer = buf, silent = true })
  vim.keymap.set('i', '<CR>', function()
    vim.cmd('stopinsert')
    submit()
  end, { buffer = buf, silent = true })
  vim.keymap.set({ 'n', 'i' }, '<Esc>', function()
    vim.cmd('stopinsert')
    cancel()
  end, { buffer = buf, silent = true })
end

return M
