# Applied AI learning studio

A local, interactive 12-week route for a Forward Deployed Engineer building applied AI skills. Start with Phase 11, ship one evolving assistant, and backfill theory when a concrete gap blocks you.

## Start

Requires Node.js 20 or newer. No package installation, account, API key, database, or build step is needed for the dashboard.

```bash
git -c core.longpaths=true clone https://github.com/athulbaburaj/applied-ai-engineering.git
cd applied-ai-engineering
node learning/server.mjs
```

Open <http://127.0.0.1:4311>. Stop with Ctrl+C. Use the same command to resume. On Windows, the clone command enables long paths for this checkout because some inherited curriculum fixture paths are long. If your chosen checkout folder is already deeply nested, use a shorter folder.

To choose another port in PowerShell:

```powershell
$env:PORT = '4312'
node learning/server.mjs
```

## The learning loop

1. Select a week and open its lessons in the built-in reader. For full lesson formatting, diagrams, and code, follow the GitHub link in the reader.
2. Run the lesson examples from their original `code/` directories. The dashboard reads the existing lessons and quizzes; it does not execute lesson code. Examples may require their documented dependencies or provider credentials. Never enter secrets into dashboard notes.
3. Attempt the practice quizzes. The latest score per lesson is saved; quizzes do not automatically complete tasks.
4. Complete the Learn / Build / Ship / Reflect checklist. Keep building the same capstone rather than starting twelve unrelated demos. Related project links provide optional reference starters.
5. Add evidence, notes, and total hours for the week. Text saves when you leave the field; checkboxes and quizzes save immediately. Confirm the header says **Saved on this computer** before closing.

The 6–8 hours per week is a planning assumption, not a completion guarantee. Slow down or repeat a week when needed. Completion measures checked tasks, not mastery; evidence and evaluation results are the real signal. Local quizzes are formative practice and expose answer keys in the browser.

## Route

| Week | Focus | Evidence |
| --- | --- | --- |
| 1 | Prompting and structured output | Baseline dataset and failure report |
| 2 | Context and evaluation | Repeatable regression suite |
| 3 | Embeddings and retrieval | Labeled retrieval benchmark |
| 4 | Grounded RAG | Citation-based Q&A prototype |
| 5 | Safe tool calls | Validated, bounded tool integration |
| 6 | Agent loops | Bounded loop and offline replay |
| 7 | MCP | Local read-only tool and contract |
| 8 | State and frameworks | Recovery test and architecture decision |
| 9 | Cost and latency | Before/after benchmark |
| 10 | Production habits | Runnable API and failure runbook |
| 11 | Capstone hardening | Held-out evaluation and release candidate |
| 12 | Demo and portfolio | Clean setup, demo, and technical narrative |

Fine-tuning is optional after the capstone: read Phase 11 / 08 only when evaluations show a gap that simpler prompt, retrieval, or workflow changes cannot address. Other optional backfill: Phase 00 for Python/HTTP, Phase 01 for vectors, Phase 02 for training and overfitting, Phase 07 for attention and tokens. This route deliberately skips the original sequential prerequisite chain; consult those prerequisites whenever a lesson feels opaque.

## Progress and backups

All dashboard tabs share `.learning-progress.json` in the repository root. This file is ignored by Git, so notes and scores stay off the remote. The local server uses atomic replacement when saving. Invalid saved data blocks startup and leaves the file intact. Back it up before repairing it or starting fresh.

**Export progress** downloads a versioned JSON backup. **Import** validates a backup and asks before replacing current progress. To move machines, export, clone the repository on the other machine, start the dashboard, and import. Progress is not cloud-synced. Use a single tab at a time: simultaneous tabs use last-save-wins behavior. Keep backups; changing the curriculum's stable task IDs requires a progress migration.

The server binds to `127.0.0.1` and rejects cross-origin writes. It is a personal local tool, without authentication or multi-user support. Keep it local.

## Customize and verify

Edit `learning/curriculum.json` to adjust tasks and pace. Existing lesson paths and stable task IDs connect progress to the curriculum. New lesson paths must have `docs/en.md` and `quiz.json`.

```bash
node --test learning/test.mjs
```

The implementation uses Node and browser standard libraries only. It preserves the inherited curriculum and license. This route was reconstructed from the confirmed 12-week, Phase 11-first request because the previous conversation's prepared overlay and detailed assistant messages were unavailable. It does not claim to reproduce that unavailable ZIP byte for byte.
