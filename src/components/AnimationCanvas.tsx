import { useMemo } from 'react'
import { kanaData } from '../data/kana-strokes'

type Style = 'fude' | 'pen'
type Speed = 'slow' | 'normal' | 'fast'

interface Props {
  text: string
  style: Style
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

export default function AnimationCanvas({ text, style, speed, playing, playKey, theme }: Props) {
  const chars = [...text].slice(0, 20)
  const timing = SPEED_MAP[speed]
  const strokeColor = theme === 'dark' ? '#e8e4dc' : '#1a1a1a'

  // Calculate layout: how many chars per row
  const charsPerRow = chars.length <= 4 ? chars.length : chars.length <= 8 ? 4 : 5
  const rows = Math.ceil(chars.length / charsPerRow)
  const cellSize = 109
  const gap = 8
  const svgWidth = charsPerRow * (cellSize + gap) - gap
  const svgHeight = rows * (cellSize + gap) - gap

  // Pre-calculate cumulative delays
  const charDelays = useMemo(() => {
    let cumulative = 0
    return chars.map((char) => {
      const delay = cumulative
      const data = kanaData[char]
      if (data) {
        cumulative += data.strokes.length * (timing.strokeDuration + timing.strokeGap) + timing.charGap
      } else {
        cumulative += timing.strokeDuration + timing.charGap
      }
      return delay
    })
  }, [chars.join(''), speed])

  if (chars.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] opacity-30">
        <p className="text-lg">文字を入力してください</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <svg
        key={playKey}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-[600px]"
        style={{ maxHeight: '60vh' }}
      >
        {chars.map((char, i) => {
          const col = i % charsPerRow
          const row = Math.floor(i / charsPerRow)
          const x = col * (cellSize + gap)
          const y = row * (cellSize + gap)
          const data = kanaData[char]
          const baseDelay = charDelays[i]

          if (!data) {
            // Unsupported character: fade in
            return (
              <g key={`${playKey}-${i}`} transform={`translate(${x}, ${y})`}>
                <text
                  x={cellSize / 2}
                  y={cellSize / 2 + 12}
                  textAnchor="middle"
                  fontSize="60"
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
            <g key={`${playKey}-${i}`} transform={`translate(${x}, ${y})`}>
              {data.strokes.map((stroke, si) => {
                const strokeDelay = baseDelay + si * (timing.strokeDuration + timing.strokeGap)
                return (
                  <path
                    key={si}
                    d={stroke.d}
                    stroke={strokeColor}
                    className={`${playing ? 'stroke-animate' : ''} stroke-${style}`}
                    style={
                      playing
                        ? {
                            strokeDasharray: stroke.length,
                            strokeDashoffset: stroke.length,
                            '--duration': `${timing.strokeDuration}s`,
                            '--delay': `${strokeDelay}s`,
                          } as React.CSSProperties
                        : {
                            fill: 'none',
                            strokeDasharray: 'none',
                            strokeDashoffset: 0,
                          }
                    }
                  />
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
