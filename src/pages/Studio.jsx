import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// 운영자용 숨은 페이지 (/studio) — Threads 배틀 카드 생성기
// html2canvas는 CDN에서 필요할 때만 로드

let html2canvasPromise = null
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas)
  if (!html2canvasPromise) {
    html2canvasPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      s.onload = () => resolve(window.html2canvas)
      s.onerror = reject
      document.head.appendChild(s)
    })
  }
  return html2canvasPromise
}

function CardReceipt({ story, side }) {
  if (!story) return null
  return (
    <div className="card-receipt">
      <div className="card-receipt-head">
        <span>ZZAN BATTLE</span>
        <span>{side}</span>
      </div>
      <div className="card-receipt-nick">{story.nickname}</div>
      <div className="card-receipt-body">{story.content}</div>
      <div className="card-receipt-foot">
        <span className="barcode" aria-hidden="true" />
      </div>
    </div>
  )
}

export default function Studio() {
  const [stories, setStories] = useState([])
  const [aId, setAId] = useState('')
  const [bId, setBId] = useState('')
  const [saving, setSaving] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    supabase
      .from('stories')
      .select('id, nickname, content, win_count')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data || []
        setStories(list)
        if (list.length >= 2) {
          setAId(list[0].id)
          setBId(list[1].id)
        }
      })
  }, [])

  const pickRandom = () => {
    if (stories.length < 2) return
    const shuffled = [...stories].sort(() => Math.random() - 0.5)
    setAId(shuffled[0].id)
    setBId(shuffled[1].id)
  }

  const download = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const html2canvas = await loadHtml2Canvas()
      const canvas = await html2canvas(cardRef.current, {
        width: 1080,
        height: 1080,
        scale: 1,
        backgroundColor: '#edebe6',
      })
      const link = document.createElement('a')
      link.download = `zzan-battle-card-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      alert('PNG 저장에 실패했어요. 카드 영역을 스크린샷으로 찍어주세요.')
    }
    setSaving(false)
  }

  const a = stories.find((s) => s.id === aId)
  const b = stories.find((s) => s.id === bId)

  return (
    <div>
      <h1 className="page-title">카드 스튜디오</h1>
      <p className="page-sub">운영자용. Threads에 올릴 1080×1080 배틀 카드를 만듭니다.</p>

      <div className="studio-controls">
        <select value={aId} onChange={(e) => setAId(e.target.value)}>
          {stories.map((s) => (
            <option key={s.id} value={s.id}>{s.nickname} — {s.content.slice(0, 20)}…</option>
          ))}
        </select>
        <select value={bId} onChange={(e) => setBId(e.target.value)}>
          {stories.map((s) => (
            <option key={s.id} value={s.id}>{s.nickname} — {s.content.slice(0, 20)}…</option>
          ))}
        </select>
        <button className="btn-small" onClick={pickRandom}>랜덤 대진</button>
        <button className="btn btn-sticker" onClick={download} disabled={saving || !a || !b}>
          {saving ? '저장 중...' : 'PNG 저장'}
        </button>
      </div>

      <div className="card-viewport">
        <div className="battle-card" ref={cardRef}>
          <div className="card-logo">
            짠내배틀 <span className="card-tag">눈물의 국밥 증정</span>
          </div>
          <div className="card-question">누가 더 불쌍한가</div>
          <div className="card-grid">
            <CardReceipt story={a} side="A" />
            <div className="card-vs">VS</div>
            <CardReceipt story={b} side="B" />
          </div>
          <div className="card-cta">투표는 프로필 링크에서 → zzan-battle.vercel.app</div>
        </div>
      </div>
    </div>
  )
}
