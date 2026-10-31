# Nightly Lab — Codex-assisted learning, not auto-merged portfolio spam

This optional layer uses the existing `learning/curriculum.json` starting at Phase 11. It never changes inherited course lessons or the dashboard progress file.

## How it works
1. At a scheduled time, the local runner checks for a clean `main` branch.
2. It selects the first lesson without a committed lab marker (a `REVIEW.md` file).
3. It creates a `lab/wNN-lesson` branch and writes an isolated `TASK.md` brief.
4. Codex generates a tiny standard-library Python experiment, deterministic tests, documentation and three unanswered learner questions.
5. The runner checks required files and changed paths; generated tests are **not executed by default** because AI-written code is untrusted.
6. A commit is made on the lab branch. The runner does **not** push, open PRs or merge; review in the morning, test in a disposable container, explain the result, then push/merge manually.

## Prerequisites

Node.js 20+, Python 3, Git, and an installed/authenticated Codex CLI that supports `codex exec --sandbox workspace-write`. Sign in locally through the CLI; do not hardcode tokens in scripts. Codex usage limits and CLI behavior depend on your subscription and installed version.

```bash
node --test nightly-lab/queue.test.mjs
node nightly-lab/run.mjs
```

To inspect the output: `git status`, `git log -1`, and `git show --stat`. For an actual Python test run, use a disposable offline sandbox or VM; then execute `python -m unittest discover -s nightly-lab/labs/<slug>` in that sandbox. `RUN_GENERATED_TESTS=1` is only for isolated environments, not your everyday host.

## Scheduling

**Windows Task Scheduler**: create a *daily* task for **21:30 Asia/Kolkata**. Action: `cmd.exe` with arguments `/c cd /d C:\\path\\to\\applied-ai-engineering && node nightly-lab\\run.mjs >> nightly-lab.log 2>&1`. Set *Run only when user is logged on* if your Codex sign-in relies on the interactive user, enable *Run task as soon as possible after a scheduled start is missed* if you want catch-up, and disable concurrent instances. Use an absolute checkout path and ensure Node/Git/Codex/Python are on the task's PATH. The machine must be on and able to run programs; a sleeping machine cannot normally execute the job without wake configuration.

**macOS/Linux**: run from a user cron entry such as `30 21 * * * cd /absolute/path/applied-ai-engineering && /usr/local/bin/node nightly-lab/run.mjs >> nightly-lab.log 2>&1` (adjust Node path and timezone). On macOS, launchd is preferable for missed runs; cron does not normally catch up automatically.

Each completed nightly branch must be reviewed, pushed and merged before the next lesson can proceed from main. Run this on a dedicated local clone rather than a checkout with active work. One lesson can take more than one night, and missed runs should not be interpreted as failed learning.

## Learner contract

Spend 20–30 minutes reading `main.py`, predicting an output, answering the questions in `REVIEW.md` without AI assistance, intentionally breaking a test, fixing it, and writing a two-sentence reflection. **Generated ≠ learned.** Merge only when you can explain the implementation and tests. Lab branches and GitHub commits represent reviewed learning, not a count of generated files.

## Limits and safeguards

No uncontrolled third-party API calls, autonomous deployments, auto-merges, secrets, or persistent service processes. A runnable local demo is the default; not every concept should become a permanently hosted service. Codex may fail, generated files may be wrong, and offline sandbox policies vary across platforms. Do not run untrusted Python on your laptop without containment.

Existing curriculum source is attributed to the original MIT-licensed project elsewhere in the repository.
