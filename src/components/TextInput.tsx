interface Props {
  value: string
  onChange: (value: string) => void
  theme: 'light' | 'dark'
}

export default function TextInput({ value, onChange, theme }: Props) {
  const charCount = value.replace(/\n/g, '').length

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <textarea
        value={value}
        onChange={(e) => {
          const raw = e.target.value
          // 改行を除いた文字数で制限
          const chars = raw.replace(/\n/g, '')
          if (chars.length <= 20) {
            onChange(raw)
          }
        }}
        placeholder="ここに文字を入力&#10;（改行で段を分けられます）"
        rows={2}
        className="w-full text-center text-2xl py-4 px-6 rounded-lg border outline-none transition-colors resize-none"
        style={{
          fontFamily: "'Zen Old Mincho', serif",
          background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          color: theme === 'dark' ? '#e8e4dc' : '#1a1a1a',
        }}
      />
      <p className="text-center text-xs mt-3 opacity-40">
        {charCount} / 20（Enterで改行）
      </p>
    </div>
  )
}
