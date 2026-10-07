import { describe, expect, it } from 'vitest'
import { isInsufficientMaterial } from './draws'
import { parseFEN } from './fen'

describe('isInsufficientMaterial', () => {
  it('is true for king vs king', () => {
    expect(isInsufficientMaterial(parseFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1').board)).toBe(true)
  })

  it('is true for king+bishop vs king', () => {
    expect(isInsufficientMaterial(parseFEN('4k3/8/8/8/8/8/8/3BK3 w - - 0 1').board)).toBe(true)
  })

  it('is true for same-color-square opposite bishops', () => {
    // c1 and f8 are both dark squares.
    expect(isInsufficientMaterial(parseFEN('4kb2/8/8/8/8/8/8/2B1K3 w - - 0 1').board)).toBe(true)
  })

  it('is false when a rook or queen is on the board', () => {
    expect(isInsufficientMaterial(parseFEN('4k3/8/8/8/8/8/8/3RK3 w - - 0 1').board)).toBe(false)
  })

  it('is false with two knights vs king (still checkmate-capable in principle, treated as sufficient)', () => {
    expect(isInsufficientMaterial(parseFEN('4k3/8/8/8/8/8/8/NNK5 w - - 0 1').board)).toBe(false)
  })
})
