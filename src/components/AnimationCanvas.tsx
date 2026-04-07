import { useMemo, forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react'
import { kanaData } from '../data/kana-strokes'
import type { Speed } from '../App'

interface Props {
  text: string
  speed: Speed
  playing: boolean
  playKey: number
  theme: 'light' | 'dark'
}

const SPEED_MAP: Record<Speed, { strokeDuration: number; strokeGap: number; charGap: number }> = {
  slow: { strokeDuration: 0.7, strokeGap: 0.12, charGap: 0.25 },
  normal: { strokeDuration: 0.45, strokeGap: 0.06, charGap: 0.12 },
  fast: { strokeDuration: 0.22, strokeGap: 0.03, charGap: 0.06 },
}

const AnimationCanvas = forwardRef<{ getCanvasEl: () => HTMLDivElement | null }, Props>(
  ({ text, speed, playing, playKey, theme }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    useImperativeHandle(ref, () => ({
      getCanvasEl: () => containerRef.current,
    }))

    const timing = SPEED_MAP[speed]
    const strokeColor = theme === 'dark' ? '#e8e4dc' : '#1a1a1a'

    const lines = text.split('\n').map((line) => [...line])
    const allChars = lines.flat()

    const cellSize = 109
    const gap = 12
    const rowGap = 16

    const maxCols = Math.max(...lines.map((l) => l.length), 1)
    const svgWidth = maxCols * (cellSize + gap) - gap
    const svgHeight = lines.length * (cellSize + rowGap) - rowGap

    const charDelayMap = useMemo(() => {
      const map = new Map<string, number>()
      let cumulative = 0
      for (let row = 0; row < lines.length; row++) {
        for (let col = 0; col < lines[row].length; col++) {
          const char = lines[row][col]
          map.set(`${row}-${col}`, cumulative)
          const data = kanaData[char]
          if (data) {
            cumulative += data.strokes.length * (timing.strokeDuration + timing.strokeGap) + timing.charGap
          } else {
            cumulative += timing.strokeDuration + timing.charGap
          }
        }
      }
      return map
    }, [text, speed])

    // After render, measure actual path lengths and apply them
    const applyRealLengths = useCallback(() => {
      const svg = svgRef.current
      if (!svg) return
      const paths = svg.querySelectorAll<SVGPathElement>('path[data-stroke]')
      paths.forEach((path) => {
        const len = path.getTotalLength()
        path.style.strokeDasharray = `${len}`
        path.style.strokeDashoffset = `${len}`
      })
    }, [])

    useEffect(() => {
      if (playing) {
        // Small delay to ensure DOM is rendered
        requestAnimationFrame(() => {
          applyRealLengths()
        })
      }
    }, [playing, playKey, applyRealLengths])

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
          ref={svgRef}
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

              if (!data) {
                return (
                  <g key={`${playKey}-${row}-${col}`} transform={`translate(${x}, ${y})`}>
                    <text
                      x={cellSize / 2}
                      y={cellSize / 2 + 16}
                      textAnchor="middle"
                      fontSize="70"
                      fill={strokeColor}
                      fontFamily="'Zen Old Mincho', serif"
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
                        data-stroke="true"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={playing ? 'stroke-animate' : ''}
                        style={
                          playing
                            ? {
                                // Initial values — will be overridden by getTotalLength
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
