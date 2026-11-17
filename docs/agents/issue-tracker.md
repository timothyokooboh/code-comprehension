# Issue tracker: GitHub

Specs and tickets live in this repository's GitHub Issues.
Use the gh CLI, resolving the repository from the origin remote.

Before creating issues, verify the target with:
gh repo view --json nameWithOwner

Read issues with gh issue view and list them with gh issue list.
Create issues with gh issue create. For multiline bodies, write
the text to a temporary file and pass --body-file.

Use native GitHub sub-issues and issue dependencies where supported.
Otherwise, record relationships with "Part of #N" and "Blocked by: #N"
in the issue body.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the GitHub issue.

PRs as a request surface: no.
