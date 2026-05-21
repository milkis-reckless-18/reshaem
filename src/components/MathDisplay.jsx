import { Component } from 'react'
import katex from 'katex'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

const spanStyle = { overflowWrap: 'break-word', wordBreak: 'break-word' }
const hasCyrillic = (s) => /[а-яёА-ЯЁ]/u.test(s)

function tryKatex(math) {
  try {
    return katex.renderToString(math, { throwOnError: true, displayMode: false, output: 'html' })
  } catch {
    return null
  }
}

export function MathDisplay({ text }) {
  const str = String(text ?? '').trim()
  if (!str) return null

  // Split on $...$ delimiters (single-line, non-empty)
  const parts = str.split(/(\$[^$\n]+\$)/g)

  if (parts.length === 1) {
    // No $...$ delimiters — try whole string as KaTeX only if no Cyrillic
    if (hasCyrillic(str)) return <span style={spanStyle}>{str}</span>
    const html = tryKatex(str)
    if (html) return <span dangerouslySetInnerHTML={{ __html: html }} style={spanStyle} />
    return <span style={spanStyle}>{str}</span>
  }

  // Mixed or delimited content — render each segment
  return (
    <span style={spanStyle}>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const html = tryKatex(part.slice(1, -1))
          if (html) return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
          return <span key={i}>{part}</span>
        }
        return part ? <span key={i}>{part}</span> : null
      })}
    </span>
  )
}
