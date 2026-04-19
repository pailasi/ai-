# Security Policy

**Languages:** [简体中文](SECURITY.md) | English

## Supported Versions

This project is currently in active development. Security fixes are applied on the latest `main` branch first.

## Reporting a Vulnerability

Please do not open public GitHub issues for security reports.

Report privately with:

- Vulnerability description
- Impact and affected components
- Reproduction steps or proof-of-concept
- Suggested remediation (if available)

Use one of these private channels:

- GitHub Security Advisories (preferred)
- Maintainer email listed in repository metadata

We aim to acknowledge reports within 3 business days and provide a status update within 7 business days.

## Scope and Priorities

Highest priority:

- Secret leakage or credential exposure
- Authentication bypass (`API_ACCESS_KEY` paths)
- Arbitrary file write/read through upload or export paths
- Unsafe command execution in generation/rendering pipeline

## Secure Development Notes

- Never commit runtime secrets (`backend/.env`, keys, tokens).
- Keep provider API credentials in environment variables only.
- Validate and sanitize external inputs, especially file uploads.
- Use dependency pinning where practical and review upgrades.
