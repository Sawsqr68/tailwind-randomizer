# Security Policy

## Reporting Security Vulnerabilities

If you believe you have found a security vulnerability, we encourage you to let us know right away.

We will investigate all legitimate reports and do our best to quickly fix the problem.

Our preference is that you make use of GitHub's private vulnerability reporting feature to disclose potential security vulnerabilities in our Open Source Software.

To do this, please visit the security tab of the repository and click the [Report a vulnerability](https://github.com/kafipointers/tailwind-randomizer/security/advisories/new) button.

## Security Measures Implemented

This repository implements several security best practices:

### Code Security

1. **Path Traversal Protection**: File system operations include validation to prevent path traversal attacks
2. **Command Injection Prevention**: All command executions use `execFile` instead of `exec` to prevent injection attacks
3. **Input Validation**: JSON parsing includes proper error handling and validation
4. **XSS Protection**: External links include `rel="noopener noreferrer"` attributes

### Web Application Security

1. **Security Headers**: Next.js application includes comprehensive security headers:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` for camera, microphone, and geolocation

### Supply Chain Security

1. **Dependency Scanning**: Regular dependency audits using GitHub Dependabot
2. **NPM Provenance**: Package publishing includes provenance for supply chain verification
3. **Pinned Actions**: GitHub Actions use specific versions to prevent supply chain attacks

### CI/CD Security

1. **Minimal Permissions**: GitHub Actions workflows use principle of least privilege
2. **Secure Command Execution**: Build scripts use safe command execution methods
3. **Secrets Management**: No hardcoded secrets or credentials in code

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Security Best Practices for Users

When using this package:

1. Keep your dependencies up to date
2. Review the generated class map files (`.next/class-map.json`) to ensure they don't contain sensitive information
3. Use the package in a secure build environment
4. Follow Next.js security best practices for your applications

## Security Audits

This repository undergoes regular security audits including:

- Automated CodeQL scanning on every commit
- Dependency vulnerability scanning via Dependabot
- Manual security reviews before releases

Last comprehensive security audit: January 2026
