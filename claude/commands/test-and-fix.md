---
description: "Run tests and fix any failures"
---

1. Detect the project's test command by checking package.json scripts, Makefile, Cargo.toml, or existing test configuration
2. Run the test suite
3. If all tests pass, report success
4. If tests fail:
   - Read the failure output carefully
   - Identify the root cause of each failure
   - Fix the underlying code (not the tests) unless the tests themselves are wrong
   - Re-run tests to verify the fix
   - Repeat until all tests pass
5. Report what was fixed and why
