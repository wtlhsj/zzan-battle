import { useEffect, useState, useCallback } from 'react'
import { supabase, getVoterKey } from '../lib/supabase'

function today() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function ReceiptCard({ story, onVote, voted, isWinner, pct, disabled }) {
  return (
    <button
      className="receipt"
      onClick={() => onVote(story.id)}
      disabled={disabled}
      aria-label={`${story.nickname}의 사연에 투표`}
    >
      <div className="receipt-head">
        <span>ZZAN BATTLE</span>
        <span>{today()}</span>
      </div>
      <div className="receipt-nick">{story.nickname}</div>
      <div className="receipt-body">{story.content}</div>
      <div className="receipt-foot">
        <span>누적 짠내 {story.win_count.toLocaleString()}표</span>
        <span className="barcode" aria-hidden="true" />
      </div>
      {voted && (
        <div className="stamp show" aria-hidden={!isWinner} style={{ visibility: isWinner ? 'visible' : 'hidden' }}>
          불쌍 인증
        </div>
      )}
      {voted && (
        <div className="result-bar">
          {pct}% 가 이쪽이 더 불쌍하다고 판정
          <div className="result-track">
            <div className="result-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </button>
  )
}

export default function Battle() {
  const [pair, setPair] = useState(null)
  const [loading, setLoading] = useState(true)
  const [votedFor, setVotedFor] = useState(null)
  const [error, setError] = useState('')

  const loadBattle = useCallback(async () => {
    setLoading(true)
    setVotedFor(null)
    setError('')
    const { data, error: err } = await supabase.rpc('get_random_battle')
    if (err || !data || data.length < 2) {
      setError('대진을 불러오지 못했어요. 잠시 후 새로고침 해주세요.')
      setPair(null)
    } else {
      setPair(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadBattle()
  }, [loadBattle])

  const handleVote = async (winnerId) => {
    if (votedFor || !pair) return
    const loserId = pair.find((s) => s.id !== winnerId).id
    setVotedFor(winnerId)

    // 낙관적 업데이트: 선택한 쪽 표수 +1
    setPair((prev) =>
      prev.map((s) => (s.id === winnerId ? { ...s, win_count: s.win_count + 1, battle_count: s.battle_count + 1 } : { ...s, battle_count: s.battle_count + 1 }))
    )

    const { data } = await supabase.rpc('cast_vote', {
      p_winner: winnerId,
      p_loser: loserId,
      p_voter_key: getVoterKey(),
    })

    if (data && data.ok === false && data.reason === 'already_voted') {
      setError('이 대진에는 이미 투표했어요. 다음 배틀로!')
    }
  }

  if (loading) return <div className="loading">짠내 측정 중...</div>

  if (!pair) {
    return (
      <div>
        <div className="loading">{error || '대진 없음'}</div>
        <div className="battle-actions">
          <button className="btn" onClick={loadBattle}>다시 시도</button>
        </div>
      </div>
    )
  }

  const [a, b] = pair
  const totalNew = votedFor ? a.win_count + b.win_count : 0
  const pctOf = (s) => (totalNew > 0 ? Math.round((s.win_count / totalNew) * 100) : 50)

  return (
    <div>
      <h1 className="page-title">오늘의 배틀</h1>
      <p className="page-sub">더 불쌍한 쪽을 누르세요. 판정은 냉정하게.</p>

      <div className="battle-grid">
        <ReceiptCard
          story={a}
          onVote={handleVote}
          voted={!!votedFor}
          isWinner={votedFor === a.id}
          pct={pctOf(a)}
          disabled={!!votedFor}
        />
        <div className="vs-badge">VS</div>
        <ReceiptCard
          story={b}
          onVote={handleVote}
          voted={!!votedFor}
          isWinner={votedFor === b.id}
          pct={pctOf(b)}
          disabled={!!votedFor}
        />
      </div>

      {error && <p className="hint">{error}</p>}

      <div className="battle-actions">
        {votedFor ? (
          <button className="btn btn-sticker" onClick={loadBattle}>다음 배틀 →</button>
        ) : (
          <p className="hint">투표하면 결과가 공개됩니다</p>
        )}
      </div>
    </div>
  )
}
