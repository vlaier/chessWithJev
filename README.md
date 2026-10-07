# Chess with Jev

A browser chess game where your opponent is [Jev](https://typesafe.ai) — an LLM that never
sees a board evaluation, only a series of multiple-choice questions. Every move Jev plays is
the result of a short, editable interrogation: *what should you focus on? which piece? where
does it go?* You can read its reasoning after each move, and rewrite the questions it gets
asked.

Built with React 19, TypeScript, Vite and Tailwind CSS. The chess rules are implemented from
scratch — no engine dependency.

## How Jev plays

Jev never picks a move from a free-text answer. On each turn the app walks a **workflow** of
constrained choice questions, where the options are generated from the actual legal moves in
the position:

1. **Pre-move steps** — open-ended strategic framing (by default: pick a focus — defense, king
   safety, material, development, attack, or center).
2. **Piece step** *(fixed)* — choose one of the pieces that actually has a legal move.
3. **Destination step** *(fixed)* — choose one of that piece's legal destinations, including
   captures, castling and promotions.
4. **Post-move steps** — reflection that feeds the commentary panel (by default: was the
   opponent's last move good? was mine?).

Because steps 2 and 3 only ever offer legal moves, Jev cannot play an illegal move. Each
step's answer is carried into later prompts via `{{placeholder}}` templating — the piece
question sees `{{focus.label}}`, the destination question sees both `{{focus.label}}` and
`{{piece.label}}`. If the API call fails after retries, the app falls back to a random legal
move and flags the decision as a fallback.

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

Create a `.env` file in the project root with your Typesafe API key:

```
JEV_API_KEY=your_key_here
```

```bash
npm run dev
```

Then open the printed local URL and play as white.

> `.env` is gitignored. The key is **never** exposed to the browser — a small Vite plugin
> (`vite-plugins/jevProxy.ts`) adds a dev- and preview-server middleware that proxies
> `POST /api/jev-move` to the Typesafe API with the `Authorization` header attached
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
