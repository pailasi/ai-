# Release Branch Preparation (v0.1.0 candidate)

Use this checklist to prepare a clean, reviewable public release branch from the current development state.

## 1) Branch and Scope Freeze

1. Create a release branch from latest `main`:
   - `git checkout -b release/v0.1.0`
2. Freeze feature scope to launch-readiness and documentation/security items only.
3. Defer non-launch enhancements to follow-up issues.

## 2) Commit Grouping Plan

Group commits into clear review units:

1. `chore(oss): add license and community governance files`
2. `ci: add backend GitHub Actions test workflow`
3. `docs(security): add prepublish security scan report`
4. `docs(readme): add open-source scope and versioning strategy`

## 3) Pre-PR Validation

Run locally before opening release PR:

```bash
cd backend
python -m unittest test_smoke.py test_workflow_engine.py test_reasoning_contracts.py test_skills_registry.py test_document_state_store.py test_telemetry_store.py
python -m pip_audit -r requirements.txt
```

## 4) Release PR Template (Suggested)

Include:

- Scope summary (what is included/excluded)
- Test evidence (commands + outputs)
- Security check result summary
- Known limitations and follow-up issues

## 5) Tagging and Publish

After merge:

1. Create tag `v0.1.0`
2. Publish GitHub release notes with:
   - setup quickstart
   - API highlights
   - known limitations
   - upgrade notes
