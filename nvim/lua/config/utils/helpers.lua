local M = {}
--- Check if a package is installed in the systems
--- @param package string: The package name to Check
--- @return boolean: True if the package is installed, false otherwise
--- Used for installing debian packages using apt
function M.is_installed(package)
	local ok = vim.fn.executable(package) == 1
	if ok then
		vim.schedule(function()
			print("pkg: " .. package .. " is installed")
		end)
	end
	return ok
end

return M
