import { useState, useEffect, useCallback } from 'react'
import TextInput from './components/TextInput'
import AnimationCanvas from './components/AnimationCanvas'
import Controls from './components/Controls'

type Style = 'fude' | 'pen'
type Speed = 'slow' | 'normal' | 'fast'
type Theme = 'light' | 'dark'

function getParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    text: params.get('text') || '',
    style: (params.get('style') as Style) || 'fude',
    speed: (params.get('speed') as Speed) || 'normal',
  }
}

export default function App() {
  const initial = getParams()
  const [text, setText] = useState(initial.text)
  const [style, setStyle] = useState<Style>(initial.style)
  const [speed, setSpeed] = useState<Speed>(initial.speed)
  const [theme, setTheme] = useState<Theme>('dark')
  const [playing, setPlaying] = useState(false)
  const [playKey, setPlayKey] = useState(0)

  // Apply theme to body
  useEffect(() => {
    document.body.className = `theme-${theme}`
  }, [theme])

  // Auto-play if URL has text param
  useEffect(() => {
    if (initial.text) {
      setPlaying(true)
      setPlayKey((k) => k + 1)
    }
  }, [])

  const handlePlay = useCallback(() => {
    setPlaying(false)
    // Force re-render by incrementing key
    requestAnimationFrame(() => {
      setPlaying(true)
      setPlayKey((k) => k + 1)
    })
  }, [])

  const handleShare = useCallback(() => {
    const base = window.location.origin + window.location.pathname
    const params = new URLSearchParams()
    params.set('text', text)
    if (style !== 'fude') params.set('style', style)
    if (speed !== 'normal') params.set('speed', speed)
    const url = `${base}?${params.toString()}`

    navigator.clipboard.writeText(url).then(() => {
      alert('URLをコピーしました')
    }).catch(() => {
      // Fallback: show URL
      prompt('URLをコピーしてください:', url)
    })
  }, [text, style, speed])

  const handleShareX = useCallback(() => {
    const base = window.location.origin + window.location.pathname
    const params = new URLSearchParams()
    params.set('text', text)
    if (style !== 'fude') params.set('style', style)
    if (speed !== 'normal') params.set('speed', speed)
    const url = `${base}?${params.toString()}`
    const tweetText = `「${text}」を書き順アニメーションで再生 ✍️`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`,
      '_blank'
    )
  }, [text, style, speed])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="text-center pt-12 pb-6">
        <p
          className="text-[10px] tracking-[6px] uppercase mb-3"
          style={{ opacity: 0.35 }}
        >
          STROKE ANIMATION GENERATOR
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-wide">
          動文字
        </h1>
        <p className="text-xs mt-1 opacity-40">DOMOJI</p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center gap-8 px-4 pb-8">
        {/* Text input */}
        <TextInput value={text} onChange={setText} theme={theme} />

        {/* Animation canvas */}
        <div className="w-full max-w-[700px] min-h-[200px] flex items-center justify-center">
          <AnimationCanvas
            text={text}
            style={style}
            speed={speed}
            playing={playing}
            playKey={playKey}
            theme={theme}
          />
        </div>

        {/* Controls */}
        <Controls
          style={style}
          onStyleChange={setStyle}
          speed={speed}
          onSpeedChange={setSpeed}
          onPlay={handlePlay}
          text={text}
          theme={theme}
          onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onShare={handleShare}
        />

        {/* X share button */}
        {text && (
          <button
            onClick={handleShareX}
            className="text-sm opacity-50 hover:opacity-80 transition-opacity cursor-pointer"
          >
            𝕏 でシェアする
          </button>
        )}
      </main>

      {/* Footer */}
      <footer
        className="text-center py-6 text-[10px] tracking-wider"
        style={{ opacity: 0.2 }}
      >
        <p>DOMOJI — Stroke Animation Generator</p>
        <p className="mt-1">Stroke data: KanjiVG (CC BY-SA 3.0)</p>
      </footer>
    </div>
  )
}
