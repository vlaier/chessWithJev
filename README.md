# Chess with Jev

A browser chess game where your opponent is [Jev](https://typesafe.ai) — TypeSafe AI's
**System One model**. Jev is not an LLM: it doesn't generate text or code at all. It reads a
state and answers *typed* questions, returning a constrained value plus calibrated
probabilities in a single parallel pass. The name nods to Kahneman — fast, intuitive
judgment rather than deliberate reasoning.

So there is no "ask the model for a move in SAN and hope it's legal" here, because that
option doesn't exist. Instead every move is the product of a short, editable interrogation
built entirely from `choice` questions whose options *are* the legal moves: *what should you
focus on? which piece? where does it go?* You can read the full chain of answers after each
move, and rewrite the questions Jev gets asked.

Built with React 19, TypeScript, Vite and Tailwind CSS. The chess rules are implemented from
scratch — no engine dependency.

## How Jev plays

On each turn the app walks a **workflow** of choice questions, where the options are generated
from the actual legal moves in the position:

1. **Pre-move steps** — open-ended strategic framing (by default: pick a focus — defense, king
   safety, material, development, attack, or center).
2. **Piece step** *(fixed)* — choose one of the pieces that actually has a legal move.
3. **Destination step** *(fixed)* — choose one of that piece's legal destinations, including
   captures, castling and promotions.
4. **Post-move steps** — reflection that feeds the commentary panel (by default: was the
   opponent's last move good? was mine?).

Because steps 2 and 3 only ever offer legal moves, an illegal move is not merely discouraged
but unrepresentable — the answer space is the legal move list. Each step's answer is carried
into later prompts via `{{placeholder}}` templating: the piece question sees
`{{focus.label}}`, the destination question sees both `{{focus.label}}` and `{{piece.label}}`.
If the API call fails after retries, the app falls back to a random legal move and flags the
decision as a fallback.

Each step is one `POST /v1/systemone` call against `jev-latest`, with the position as
`state` (FEN plus the side to move plus the answers so far) and a single `choice` question
whose `criteria` map option keys to their human-readable labels. Jev's reply carries the
chosen key — and, unused by this app so far, per-option `probabilities` and a `confidence`
score, which would be the natural hook for a difficulty setting or for showing how close a
decision was.

### Editing the workflow

The in-app workflow editor lets you add, remove and rewrite the pre-move and post-move steps —
their instructions and their answer options — and reword the two fixed prompts. Available
placeholders include `{{color}}`, `{{lastPlayerMove}}`, `{{chosenMove}}`, and `{{<key>.label}}`
for any earlier step. The keys `piece` and `destination` are reserved.

Your configuration is persisted to `localStorage`, and **Reset to default** restores the
shipped workflow.

## The chess engine

`src/engine/` is a self-contained, dependency-free rules implementation:

| Module | Responsibility |
| --- | --- |
| `board.ts` | Square/algebraic conversion, file and rank helpers |
| `moves.ts` | Raw move generation per piece type |
| `attacks.ts` | Square attack detection |
| `legality.ts` | Legal move filtering, check detection, castling and en passant rules |
| `gameState.ts` | Applying moves, turn and status transitions |
| `draws.ts` | Stalemate, fifty-move rule, threefold repetition, insufficient material |
| `notation.ts` | Standard Algebraic Notation output |
| `fen.ts` | FEN serialization (used to describe positions to Jev) |

Covered by 83 tests across 11 files.

## Getting started

```bash
npm install
```

Create a `.env` file in the project root with your TypeSafe AI API key (Jev is served only
from TypeSafe's hosted API, currently behind an early-access waitlist — there are no
published weights and no on-prem option):

```
JEV_API_KEY=your_key_here
```

```bash
npm run dev
```

Then open the printed local URL and play as white.

> `.env` is gitignored. The key is **never** exposed to the browser — a small Vite plugin
> (`vite-plugins/jevProxy.ts`) adds a dev- and preview-server middleware that proxies
> `POST /api/jev-move` to the TypeSafe AI API with the `Authorization` header attached
> server-side. Note that this means a plain static `npm run build` output has no backend for
> that route; deploying the app requires providing your own equivalent proxy endpoint.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build (includes the Jev proxy) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with Oxlint |

## Project layout

```
src/
  engine/      chess rules — no React, no network
  ai/          Jev request building, workflow config and templating
  hooks/       useChessGame, useJevOpponent, useJevWorkflowConfig
  components/  Board, Square, Piece, MoveHistory, JevReasoning, JevWorkflowEditor, …
vite-plugins/
  jevProxy.ts  dev/preview middleware that keeps the API key server-side
```
