import { useMemo, forwardRef, useImperativeHandle, useRef } from 'react'
import { kanaData } from '../data/kana-strokes'
import type { FontStyle, Speed } from '../App'

interface Props {
  text: string
  fontStyle: FontStyle
  speed: Speed
  playing: boolean
  playKey: number
  theme: 'light' | 'dark'
}

const SPEED_MAP: Record<Speed, { strokeDuration: number; strokeGap: number; charGap: number }> = {
  slow: { strokeDuration: 0.6, strokeGap: 0.15, charGap: 0.3 },
  normal: { strokeDuration: 0.4, strokeGap: 0.08, charGap: 0.15 },
  fast: { strokeDuration: 0.2, strokeGap: 0.04, charGap: 0.08 },
}

const FONT_MAP: Record<FontStyle, string> = {
  gothic: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
  mincho: "'Zen Old Mincho', 'Hiragino Mincho ProN', serif",
}

const AnimationCanvas = forwardRef<{ getCanvasEl: () => HTMLDivElement | null }, Props>(
  ({ text, fontStyle, speed, playing, playKey, theme }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      getCanvasEl: () => containerRef.current,
    }))

    const timing = SPEED_MAP[speed]
    const strokeColor = theme === 'dark' ? '#e8e4dc' : '#1a1a1a'

    // Split text into lines by \n, then each line into chars
    const lines = text.split('\n').map((line) => [...line])
    const allChars = lines.flat()

    const cellSize = 109
    const gap = 12
    const rowGap = 16

    // Calculate SVG dimensions
    const maxCols = Math.max(...lines.map((l) => l.length), 1)
    const svgWidth = maxCols * (cellSize + gap) - gap
    const svgHeight = lines.length * (cellSize + rowGap) - rowGap

    // Calculate cumulative delays across ALL chars (left-to-right, top-to-bottom)
    const charDelayMap = useMemo(() => {
      const map = new Map<string, number>()
      let cumulative = 0
      let idx = 0
      for (let row = 0; row < lines.length; row++) {
        for (let col = 0; col < lines[row].length; col++) {
          const char = lines[row][col]
          const key = `${row}-${col}`
          map.set(key, cumulative)
          const data = kanaData[char]
          if (data) {
            cumulative += data.strokes.length * (timing.strokeDuration + timing.strokeGap) + timing.charGap
          } else {
            cumulative += timing.strokeDuration + timing.charGap
          }
          idx++
        }
      }
      return map
    }, [text, speed])

    if (allChars.length === 0) {
      return (
        <div ref={containerRef} className="flex items-center justify-center min-h-[140px] opacity-25">
          <p className="text-lg">文字を入力してください</p>
        </div>
      )
    }

    return (
      <div ref={containerRef} className="flex justify-center w-full">
        <svg
          key={playKey}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{
            maxHeight: '50vh',
            maxWidth: `${Math.min(maxCols * 80, 800)}px`,
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {lines.map((lineChars, row) =>
            lineChars.map((char, col) => {
              const x = col * (cellSize + gap)
              const y = row * (cellSize + rowGap)
              const data = kanaData[char]
              const baseDelay = charDelayMap.get(`${row}-${col}`) || 0
              const strokeWidth = fontStyle === 'gothic' ? 5 : 3

              if (!data) {
                return (
                  <g key={`${playKey}-${row}-${col}`} transform={`translate(${x}, ${y})`}>
                    <text
                      x={cellSize / 2}
                      y={cellSize / 2 + 16}
                      textAnchor="middle"
                      fontSize="70"
                      fill={strokeColor}
                      fontFamily={FONT_MAP[fontStyle]}
                      className={playing ? 'char-fadein' : ''}
                      style={playing ? { '--delay': `${baseDelay}s` } as React.CSSProperties : { opacity: 1 }}
                    >
                      {char}
                    </text>
                  </g>
                )
              }

              return (
                <g key={`${playKey}-${row}-${col}`} transform={`translate(${x}, ${y})`}>
                  {data.strokes.map((stroke, si) => {
                    const strokeDelay = baseDelay + si * (timing.strokeDuration + timing.strokeGap)
                    return (
                      <path
                        key={si}
                        d={stroke.d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={playing ? 'stroke-animate' : ''}
                        style={
                          playing
                            ? {
                                strokeDasharray: stroke.length,
                                strokeDashoffset: stroke.length,
                                '--duration': `${timing.strokeDuration}s`,
                                '--delay': `${strokeDelay}s`,
                              } as React.CSSProperties
                            : {
                                strokeDasharray: 'none',
                                strokeDashoffset: 0,
                              }
                        }
                      />
                    )
                  })}
                </g>
              )
            })
          )}
        </svg>
      </div>
    )
  }
)

AnimationCanvas.displayName = 'AnimationCanvas'
export default AnimationCanvas
