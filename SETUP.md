# SURNA Repository Setup

## One-time setup for developers

After cloning the repository, run these commands once:

```bash
# Set up git commit template
git config commit.template .gitmessage.txt

# Install dependencies (includes husky)
npm install

# Initialize husky hooks
npm run prepare

# Make hooks executable (if needed)
chmod +x .husky/commit-msg .husky/pre-push
```

## What's been configured

✅ **Developer Guidelines** - See CONTRIBUTING.md  
✅ **Commit Template** - Structured commit messages with [TYPE] prefixes  
✅ **Git Hooks** - Validates commit messages and branch names  
✅ **PR Template** - Standardized pull request format  
✅ **CI Workflow** - Branch name validation on pull requests  

## Repository Safety Features

- **Commit Message Validation**: Must start with [DB], [API], [UI], [DOCS], [CHORE], or [REFACTOR]
- **Branch Name Enforcement**: Must follow `type/scope/short-slug` pattern
- **Pull Request Template**: Ensures backward compatibility and migration safety
- **CI Checks**: Automated branch name validation

## Need Help?

- Read CONTRIBUTING.md for detailed guidelines
- Use the commit template: git commit (it will open with the template)
- Branch naming examples: `feature/messenger/add-groups`, `fix/auth/token-refresh`