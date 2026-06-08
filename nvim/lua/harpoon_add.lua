-- Script to add files to Harpoon from external commands
-- Usage: nvim -c "lua dofile('~/.config/nvim/lua/harpoon_add.lua')" -c "qa" /path/to/file

local function add_file_to_harpoon()
    local file_path = vim.fn.argv(0)
    
    if not file_path or file_path == "" then
        print("Error: No file path provided")
        return
    end
    
    file_path = vim.fn.fnamemodify(file_path, ":p")
    
    if vim.fn.filereadable(file_path) == 0 then
        print("Error: File does not exist: " .. file_path)
        return
    end
    
    local file_dir = vim.fn.fnamemodify(file_path, ":h")
    vim.cmd("cd " .. file_dir)
    
    local root_markers = {'.git', '.hg', 'package.json', 'Cargo.toml', 'pyproject.toml', 'Makefile', '.root'}
    local root = vim.fs.root(file_path, root_markers)
    
    if root then
        vim.cmd("cd " .. root)
        print("Using project root: " .. root)
    else
        print("Warning: No project root found, using file directory: " .. file_dir)
    end
    
    vim.cmd("edit " .. file_path)
    
    local harpoon = require("harpoon")
    harpoon:list():add()
    
    print("Added to Harpoon: " .. vim.fn.fnamemodify(file_path, ":t"))
end

add_file_to_harpoon()