# Prepublish Security Check Report

Date: 2026-04-18
Scope: `Sci-Copilot` repository (current working tree)

## 1) Secrets Scan

### Command

- Pattern scan over tracked source files for common token/key signatures
- Pattern scan for suspicious inline assignments (`api_key=...`, `token=...`, `password=...`)

### Result

- No high-confidence real secret tokens detected in repository content.
- One expected template hit in `backend/.env.example` (placeholder keys).

## 2) Dependency Vulnerability Scan

### Command

```bash
cd backend
python -m pip_audit -r requirements.txt
```

### Result

`pip-audit` reported 2 vulnerabilities:

1. `langchain-text-splitters==0.3.11`
   - Advisory: `GHSA-fv5p-p927-qmxr`
   - Fixed in: `1.1.2`
2. `transformers==4.57.6` (transitive dependency)
   - Advisory: `CVE-2026-1839`
   - Fixed in: `5.0.0rc3`

## 3) Risk Assessment

- Current state is acceptable for controlled beta usage, but not ideal for public OSS release hardening.
- At least one vulnerable package has a direct upgrade path (`langchain-text-splitters`).
- `transformers` upgrade likely needs compatibility validation with `sentence-transformers`.

## 4) Required Follow-up Before Public Release

1. Upgrade `langchain-text-splitters` to a non-vulnerable version and run regression tests.
2. Evaluate `transformers` upgrade feasibility with current embedding stack.
3. Add dependency audit to CI as a non-blocking step first, then promote to blocking after compatibility update.
