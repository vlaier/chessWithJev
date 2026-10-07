import { describe, expect, it } from 'vitest'
import { algebraicToSquare, createInitialBoard, squareToAlgebraic } from './board'

describe('coordinates', () => {
  it('converts algebraic to square index and back', () => {
    expect(algebraicToSquare('a1')).toBe(0)
    expect(algebraicToSquare('h1')).toBe(7)
    expect(algebraicToSquare('a8')).toBe(56)
    expect(algebraicToSquare('h8')).toBe(63)
    expect(algebraicToSquare('e4')).toBe(28)

    expect(squareToAlgebraic(0)).toBe('a1')
    expect(squareToAlgebraic(7)).toBe('h1')
    expect(squareToAlgebraic(56)).toBe('a8')
    expect(squareToAlgebraic(63)).toBe('h8')
    expect(squareToAlgebraic(28)).toBe('e4')
  })
})

describe('createInitialBoard', () => {
  it('sets up the standard starting position', () => {
    const board = createInitialBoard()
    expect(board[algebraicToSquare('e1')]).toEqual({ type: 'king', color: 'white' })
    expect(board[algebraicToSquare('e8')]).toEqual({ type: 'king', color: 'black' })
    expect(board[algebraicToSquare('a1')]).toEqual({ type: 'rook', color: 'white' })
    expect(board[algebraicToSquare('h8')]).toEqual({ type: 'rook', color: 'black' })
    expect(board[algebraicToSquare('e2')]).toEqual({ type: 'pawn', color: 'white' })
    expect(board[algebraicToSquare('e7')]).toEqual({ type: 'pawn', color: 'black' })
    for (let sq = 16; sq < 48; sq++) {
      expect(board[sq]).toBeNull()
    }
  })
})
