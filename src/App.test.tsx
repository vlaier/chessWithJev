import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

function squareEl(alg: string): HTMLElement {
  const el = document.querySelector(`[data-square="${alg}"]`)
  if (!el) throw new Error(`square ${alg} not found`)
  return el as HTMLElement
}

describe('App board interaction', () => {
  it('highlights legal targets when clicking a piece, and none before that', () => {
    render(<App />)
    expect(document.querySelectorAll('[data-legal-target]')).toHaveLength(0)

    fireEvent.click(squareEl('e2'))

    const highlighted = Array.from(document.querySelectorAll('[data-legal-target]')).map(
      (el) => el.getAttribute('data-square'),
    )
    expect(highlighted.sort()).toEqual(['e3', 'e4'])
  })

  it('highlights legal targets on hover without needing a click', () => {
    render(<App />)
    fireEvent.mouseEnter(squareEl('g1'))

    const highlighted = Array.from(document.querySelectorAll('[data-legal-target]')).map(
      (el) => el.getAttribute('data-square'),
    )
    expect(highlighted.sort()).toEqual(['f3', 'h3'])
  })

  it('moves a piece when clicking a highlighted legal square', () => {
    render(<App />)
    fireEvent.click(squareEl('e2'))
    fireEvent.click(squareEl('e4'))

    expect(squareEl('e4').getAttribute('aria-label')).toContain('white pawn')
    expect(squareEl('e2').getAttribute('aria-label')).not.toContain('pawn')
    expect(screen.getByText(/black to move/i)).toBeInTheDocument()
  })

  it('does nothing when clicking a square the selected piece cannot legally reach', () => {
    render(<App />)
    fireEvent.click(squareEl('e2'))
    fireEvent.click(squareEl('e5')) // not reachable in one move from e2

    // Piece should not have moved, and it should still be white's turn.
    expect(squareEl('e2').getAttribute('aria-label')).toContain('white pawn')
    expect(screen.getByText(/white to move/i)).toBeInTheDocument()
  })

  it('plays a full scripted checkmate and shows the game-end banner', () => {
    render(<App />)
    fireEvent.click(squareEl('f2'))
    fireEvent.click(squareEl('f3'))
    fireEvent.click(squareEl('e7'))
    fireEvent.click(squareEl('e5'))
    fireEvent.click(squareEl('g2'))
    fireEvent.click(squareEl('g4'))
    fireEvent.click(squareEl('d8'))
    fireEvent.click(squareEl('h4'))

    expect(screen.getByText(/checkmate/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument()
  })
})
