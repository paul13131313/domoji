interface Props {
  value: string
  onChange: (value: string) => void
  theme: 'light' | 'dark'
}

export default function TextInput({ value, onChange, theme }: Props) {
  return (
    <div className="w-full max-w-[500px] mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 20))}
        placeholder="ここに文字を入力"
        maxLength={20}
        className="w-full text-center text-2xl py-4 px-6 rounded-lg border outline-none transition-colors"
        style={{
          fontFamily: "'Zen Old Mincho', serif",
          background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          color: theme === 'dark' ? '#e8e4dc' : '#1a1a1a',
        }}
      />
      <p className="text-center text-xs mt-2 opacity-40">
        {value.length} / 20
      </p>
    </div>
  )
}
