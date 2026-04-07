type Style = 'fude' | 'pen'
type Speed = 'slow' | 'normal' | 'fast'

interface Props {
  style: Style
  onStyleChange: (s: Style) => void
  speed: Speed
  onSpeedChange: (s: Speed) => void
  onPlay: () => void
  text: string
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  onShare: () => void
}

const STYLES: { value: Style; label: string }[] = [
  { value: 'fude', label: '筆' },
  { value: 'pen', label: 'ペン' },
]

const SPEEDS: { value: Speed; label: string }[] = [
  { value: 'slow', label: 'ゆっくり' },
  { value: 'normal', label: '普通' },
  { value: 'fast', label: 'はやい' },
]

export default function Controls({
  style, onStyleChange,
  speed, onSpeedChange,
  onPlay, text,
  theme, onThemeToggle,
  onShare,
}: Props) {
  const btnBase = "px-4 py-2 rounded-md text-sm transition-all cursor-pointer border"
  const activeBg = theme === 'dark'
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(0,0,0,0.08)'
  const activeBorder = theme === 'dark'
    ? 'rgba(255,255,255,0.25)'
    : 'rgba(0,0,0,0.2)'
  const inactiveBorder = theme === 'dark'
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)'

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Style & Speed row */}
      <div className="flex flex-wrap justify-center gap-6">
        {/* Style */}
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-40 mr-1">スタイル</span>
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => onStyleChange(s.value)}
              className={btnBase}
              style={{
                background: style === s.value ? activeBg : 'transparent',
                borderColor: style === s.value ? activeBorder : inactiveBorder,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-40 mr-1">速度</span>
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              onClick={() => onSpeedChange(s.value)}
              className={btnBase}
              style={{
                background: speed === s.value ? activeBg : 'transparent',
                borderColor: speed === s.value ? activeBorder : inactiveBorder,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onPlay}
          disabled={!text}
          className="px-8 py-3 rounded-lg text-base font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: theme === 'dark' ? '#e8e4dc' : '#1a1a1a',
            color: theme === 'dark' ? '#0D0D0D' : '#F5F0E8',
          }}
        >
          ▶ 再生
        </button>

        <button
          onClick={onShare}
          disabled={!text}
          className="px-6 py-3 rounded-lg text-base transition-all cursor-pointer border disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
          }}
        >
          共有
        </button>

        <button
          onClick={onThemeToggle}
          className="px-4 py-3 rounded-lg text-base transition-all cursor-pointer border"
          style={{
            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
          }}
          title={theme === 'dark' ? '明るいテーマ' : '暗いテーマ'}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </div>
    </div>
  )
}
