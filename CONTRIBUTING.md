# Contributing Guide — FoodTrapp IM101 Project

> Follow these standards strictly. Non-compliant commits and PRs will be flagged during evaluation.

---

## 📌 Branch Protection Rules

- **Direct pushes to `main` are prohibited.**
- All changes must go through a **Pull Request (PR)** reviewed and approved by the Git Administrator.

---

## 🌿 Branch Naming Convention

Create branches from `main` using this format:

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New feature or schema addition | `feature/erd-schema-v1` |
| `feature/` | Stored procedures, triggers, etc. | `feature/stored-procedures-audit` |
| `fix/` | Bug or syntax corrections | `fix/stored-procedure-syntax` |
| `docs/` | Documentation updates | `docs/update-readme` |
| `hotfix/` | Critical production fixes | `hotfix/broken-login-route` |
| `refactor/` | Code restructuring | `refactor/normalize-db-schema` |

### Creating a new branch

```bash
# Always branch off main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

---

## ✍️ Commit Message Standards

**Format:**
```
<prefix>: <short imperative description>
```

**Allowed prefixes:**

| Prefix | Use for |
|---|---|
| `feat:` | New feature, schema, endpoint, UI component |
| `fix:` | Bug fix, syntax error correction |
| `docs:` | README, comments, documentation |
| `refactor:` | Restructured code, no functional change |
| `test:` | Test scripts, test queries |
| `chore:` | Config files, `.gitignore`, tooling |
| `db:` | Database-specific changes (triggers, procedures, indexes) |

### ✅ Good examples
```
feat: add POST /api/orders endpoint with input validation
fix: correct syntax error inside sp_audit_log stored procedure
db: add trigger trg_transaction_history for order updates
docs: update README with local setup instructions
refactor: normalize supplier table to remove redundant columns
```

### ❌ Bad examples (will be penalized)
```
final files
fixed all
update
changes
```

---

## 🔁 Workflow Pipeline

```
main (protected)
  └── feature/your-feature      ← develop here
        └── commit, commit, commit
              └── Push branch to GitHub
                    └── Open Pull Request → reviewed by Git Admin → Merged
```

### Step-by-step

```bash
# 1. Create your feature branch
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. Do your work, then stage and commit
git add <specific-files>
git commit -m "feat: describe the specific change you made"

# 3. Push the branch to GitHub
git push origin feature/your-feature-name

# 4. Open a Pull Request on GitHub
#    → Fill out the PR template
#    → Request review from the Git Administrator
#    → Do NOT merge your own PR
```

---

## 🚫 What NOT to Do

- ❌ `git push origin main` — blocked by branch protection
- ❌ Committing `.env` files or credentials
- ❌ Giant single commits with everything in them
- ❌ Generic commit messages like "done", "final", "upload"
- ❌ Merging your own Pull Request without administrator review
