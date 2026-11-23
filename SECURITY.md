# Security policy

siterun runs WordPress and PHP on your own machine. It has no account, no telemetry and no remote service behind it, so the security boundary is the app, the engine and the files they touch.

## Supported versions

The current `0.1.x` line receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private vulnerability reporting:

https://github.com/NewJenk/siterun/security/advisories/new

If that is unavailable, email **shaun@goingbold.co.uk**.

Include the app version, your operating system, the steps to reproduce, the impact and any proof of concept. Remove real site data, passwords and personal information from screenshots and logs.

## In scope

- The desktop app and the engine in this repository.
- Site creation, start, stop and deletion.
- Custom domains and HTTPS certificate handling.
- The database browser, including the guarded write mode.
- Blueprint and backup import, including zip and URL handling.
- WP-CLI execution and export/restore.
- Sandbox escape, arbitrary file read or write, command injection, path traversal, privilege escalation, unsafe temporary files and dependency vulnerabilities.

## Out of scope

- Vulnerabilities in WordPress core, PHP, WP-CLI, plugins or themes. Report those to their own projects.
- Sites you create, and anything installed into them.
- Issues that need physical access to an unlocked machine or an already-compromised administrator account.
- Social engineering.

## What to expect

I will acknowledge a report within three working days and aim to give an initial assessment within seven. Fixes are best effort; there is no bug bounty.

Thank you for reporting privately.
