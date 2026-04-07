import { useState, useEffect, useCallback, useRef } from 'react'
import TextInput from './components/TextInput'
import AnimationCanvas from './components/AnimationCanvas'
import Controls from './components/Controls'

export type Speed = 'slow' | 'normal' | 'fast'
export type Theme = 'light' | 'dark'

function getParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    text: params.get('text') || '',
    speed: (params.get('speed') as Speed) || 'normal',
  }
}

export default function App() {
  const initial = getParams()
  const [text, setText] = useState(initial.text)
  const [speed, setSpeed] = useState<Speed>(initial.speed)
  const [theme, setTheme] = useState<Theme>('dark')
  const [playing, setPlaying] = useState(false)
  const [playKey, setPlayKey] = useState(0)
  const [recording, setRecording] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const canvasRef = useRef<{ getCanvasEl: () => HTMLDivElement | null }>(null)

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
    requestAnimationFrame(() => {
      setPlaying(true)
      setPlayKey((k) => k + 1)
    })
  }, [])

  const handleShare = useCallback(async () => {
    if (!text) return
    setRecording(true)

    // Start recording, then play animation
    setPlaying(false)
    await new Promise((r) => setTimeout(r, 50))

    const container = canvasRef.current?.getCanvasEl()
    if (!container) {
      setRecording(false)
      return
    }

    // Use canvas-based recording
    const { recordAnimation } = await import('./utils/recorder')
    setPlaying(true)
    setPlayKey((k) => k + 1)

    try {
      const blob = await recordAnimation(container, text, speed)
      setRecording(false)

      // 前のURLを解放
      if (videoUrl) URL.revokeObjectURL(videoUrl)

      const url = URL.createObjectURL(blob)
      setVideoUrl(url)
    } catch {
      setRecording(false)
    }
  }, [text, speed])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="text-center pt-16 pb-4 md:pt-20 md:pb-6">
        <p
          className="text-[10px] tracking-[6px] uppercase mb-4"
          style={{ opacity: 0.3 }}
        >
          STROKE ANIMATION GENERATOR
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-wide">
          動文字
        </h1>
        <p className="text-xs mt-2 opacity-35">DOMOJI</p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        {/* Text input */}
        <div className="mt-10 mb-12 w-full">
          <TextInput value={text} onChange={setText} theme={theme} />
        </div>

        {/* Animation canvas */}
        <div className="w-full max-w-[800px] min-h-[140px] mb-14 flex items-center justify-center">
          <AnimationCanvas
            ref={canvasRef}
            text={text}
            speed={speed}
            playing={playing}
            playKey={playKey}
            theme={theme}
          />
        </div>

        {/* Controls */}
        <div className="mb-8">
          <Controls
            speed={speed}
            onSpeedChange={setSpeed}
            onPlay={handlePlay}
            onShare={handleShare}
            text={text}
            theme={theme}
            onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            recording={recording}
          />
        </div>
      </main>

      {/* Video Preview Modal */}
      {videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { URL.revokeObjectURL(videoUrl); setVideoUrl(null) }}
        >
          <div
            className="flex flex-col items-center gap-6 p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full rounded-lg"
              style={{ maxHeight: '60vh' }}
            />
            <p className="text-white/60 text-xs text-center">
              動画を長押し or 右クリックで保存できます
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = videoUrl
                  a.download = `domoji-${text}.webm`
                  a.click()
                }}
                className="px-6 py-3 rounded-lg text-sm font-bold cursor-pointer"
                style={{ background: '#e8e4dc', color: '#0D0D0D' }}
              >
                ⬇ ダウンロード
              </button>
              <button
                onClick={() => { URL.revokeObjectURL(videoUrl); setVideoUrl(null) }}
                className="px-6 py-3 rounded-lg text-sm cursor-pointer border"
                style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#e8e4dc' }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="text-center py-8 text-[10px] tracking-wider"
        style={{ opacity: 0.2 }}
      >
        <p>DOMOJI — Stroke Animation Generator</p>
        <p className="mt-1">Stroke data: KanjiVG (CC BY-SA 3.0)</p>
      </footer>
    </div>
  )
}
