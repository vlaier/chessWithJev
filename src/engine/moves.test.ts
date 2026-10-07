import { describe, expect, it } from 'vitest'
import { algebraicToSquare, squareToAlgebraic } from './board'
import { parseFEN } from './fen'
import { generatePseudoLegalMoves } from './moves'

const targets = (state: ReturnType<typeof parseFEN>, from: string) =>
  generatePseudoLegalMoves(state, algebraicToSquare(from))
    .map((m) => squareToAlgebraic(m.to))
    .sort()

describe('knight moves', () => {
  it('generates all L-shaped moves from the center', () => {
    const state = parseFEN('8/8/8/8/3N4/8/8/8 w - - 0 1')
    expect(targets(state, 'd4')).toEqual(
      ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'].sort(),
    )
  })
})

describe('bishop moves', () => {
  it('slides diagonally until blocked', () => {
    const state = parseFEN('8/8/8/8/3B4/8/8/8 w - - 0 1')
    const result = targets(state, 'd4')
    expect(result).toContain('a1')
    expect(result).toContain('g7')
    expect(result).toContain('h8')
    expect(result).toContain('a7')
  })

  it('stops at own pieces and captures enemy pieces', () => {
    const state = parseFEN('8/8/8/8/3B4/8/1p6/8 w - - 0 1')
    const result = targets(state, 'd4')
    expect(result).toContain('b2')
    expect(result).not.toContain('a1')
  })
})

describe('rook moves', () => {
  it('slides horizontally and vertically until blocked', () => {
    const state = parseFEN('8/8/8/8/3R4/8/8/8 w - - 0 1')
    const result = targets(state, 'd4')
    expect(result).toContain('d1')
    expect(result).toContain('d8')
    expect(result).toContain('a4')
    expect(result).toContain('h4')
  })
})

describe('pawn moves', () => {
  it('allows single and double push from start rank', () => {
    const state = parseFEN('8/8/8/8/8/8/4P3/8 w - - 0 1')
    expect(targets(state, 'e2')).toEqual(['e3', 'e4'].sort())
  })

  it('does not allow double push after moving once', () => {
    const state = parseFEN('8/8/8/8/4P3/8/8/8 w - - 0 1')
    expect(targets(state, 'e4')).toEqual(['e5'])
  })

  it('captures diagonally only', () => {
    const state = parseFEN('8/8/8/8/8/3p1p2/4P3/8 w - - 0 1')
    expect(targets(state, 'e2')).toEqual(['d3', 'e3', 'e4', 'f3'].sort())
  })

  it('generates promotion moves on the last rank', () => {
    const state = parseFEN('8/4P3/8/8/8/8/8/8 w - - 0 1')
    const moves = generatePseudoLegalMoves(state, algebraicToSquare('e7'))
    expect(moves).toHaveLength(4)
    expect(moves.map((m) => m.promotion).sort()).toEqual(['bishop', 'knight', 'queen', 'rook'])
  })

  it('supports en passant capture', () => {
    const state = parseFEN('8/8/8/3pP3/8/8/8/8 w - d6 0 1')
    expect(targets(state, 'e5')).toEqual(['d6', 'e6'].sort())
  })
})

describe('king moves', () => {
  it('moves one square in any direction', () => {
    const state = parseFEN('8/8/8/8/3K4/8/8/8 w - - 0 1')
    expect(targets(state, 'd4')).toEqual(
      ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'].sort(),
    )
  })

  it('offers castling when rights and squares allow', () => {
    const state = parseFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    const result = targets(state, 'e1')
    expect(result).toContain('g1')
    expect(result).toContain('c1')
  })

  it('does not offer castling through occupied squares', () => {
    const state = parseFEN('r3k2r/8/8/8/8/8/8/R2NK2R w KQkq - 0 1')
    const result = targets(state, 'e1')
    expect(result).not.toContain('c1')
  })

  it('does not offer castling while in check', () => {
    const state = parseFEN('4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1')
    const result = targets(state, 'e1')
    expect(result).not.toContain('g1')
    expect(result).not.toContain('c1')
  })

  it('does not offer castling through an attacked square', () => {
    const state = parseFEN('5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1')
    const result = targets(state, 'e1')
    expect(result).not.toContain('g1')
  })
})
