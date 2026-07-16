import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, getVoterKey } from '../lib/supabase'
import { OPEN_CHAT_URL } from '../lib/config'

const DAILY_COUNT = 10
const BONUS_LIMIT = 5

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayDisplay() {
  return todayKey().replaceAll('-', '.')
}

// 오늘의 세션: 날짜별로 대진 10판을 만들어 localStorage에 고정
function loadSession(stories) {
  const key = `zzan_session_${todayKey()}`
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved && Array.isArray(saved.pairs) && typeof saved.done === 'number') {
      return { key, pairs: saved.pairs, done: saved.done, bonus: saved.bonus || 0 }
    }
  } catch { /* 손상된 세션은 새로 생성 */ }

  const shuffled = [...stories].sort(() => Math.random() - 0.5)
  const pairs = []
  for (let i = 0; i + 1 < shuffled.length && pairs.length < DAILY_COUNT; i += 2) {
    pairs.push([shuffled[i].id, shuffled[i + 1].id])
  }
  const session = { pairs, done: 0, bonus: 0 }
  localStorage.setItem(key, JSON.stringify(session))
  return { key, ...session }
}

function saveSession(session) {
  localStorage.setItem(session.key, JSON.stringify({ pairs: session.pairs, done: session.done, bonus: session.bonus || 0 }))
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
        <span>{todayDisplay()}</span>
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
  const [storyMap, setStoryMap] = useState(null) // id -> story
  const [session, setSession] = useState(null)
  const [bonusPair, setBonusPair] = useState(null) // 보너스 모드 대진
  const [mode, setMode] = useState('daily') // 'daily' | 'bonus'
  const [votedFor, setVotedFor] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('stories')
      .select('id, nickname, content, win_count, battle_count')
      .eq('status', 'approved')
      .then(({ data, error: err }) => {
        if (err || !data || data.length < 2) {
          setError('사연을 불러오지 못했어요. 새로고침 해주세요.')
        } else {
          const map = {}
          data.forEach((s) => { map[s.id] = s })
          setStoryMap(map)
          setSession(loadSession(data))
        }
        setLoading(false)
      })
  }, [])

  // 현재 대진 (검수로 사연이 내려간 경우 해당 판은 건너뜀)
  const getDailyPair = () => {
    if (!session || !storyMap) return null
    let idx = session.done
    while (idx < session.pairs.length) {
      const [a, b] = session.pairs[idx]
      if (storyMap[a] && storyMap[b]) {
        if (idx !== session.done) {
          const next = { ...session, done: idx }
          setSession(next)
          saveSession(next)
        }
        return [storyMap[a], storyMap[b]]
      }
      idx += 1
    }
    return null
  }

  const loadBonus = useCallback(async () => {
    setVotedFor(null)
    setError('')
    const { data, error: err } = await supabase.rpc('get_random_battle')
    if (err || !data || data.length < 2) {
      setError('대진을 불러오지 못했어요.')
      setBonusPair(null)
    } else {
      setBonusPair(data)
    }
  }, [])

  const pair = mode === 'bonus' ? bonusPair : getDailyPair()
  const total = session ? session.pairs.length : DAILY_COUNT
  const dailyDone = session ? Math.min(session.done, total) : 0
  const dailyComplete = mode === 'daily' && session && !pair

  const handleVote = async (winnerId) => {
    if (votedFor || !pair) return
    const loserId = pair.find((s) => s.id !== winnerId).id
    setVotedFor(winnerId)

    // 낙관적 업데이트
    if (mode === 'bonus') {
      setBonusPair((prev) =>
        prev.map((s) =>
          s.id === winnerId
            ? { ...s, win_count: s.win_count + 1, battle_count: s.battle_count + 1 }
            : { ...s, battle_count: s.battle_count + 1 }
        )
      )
    } else {
      setStoryMap((prev) => {
        const next = { ...prev }
        next[winnerId] = { ...next[winnerId], win_count: next[winnerId].win_count + 1, battle_count: next[winnerId].battle_count + 1 }
        next[loserId] = { ...next[loserId], battle_count: next[loserId].battle_count + 1 }
        return next
      })
    }

    const { data } = await supabase.rpc('cast_vote', {
      p_winner: winnerId,
      p_loser: loserId,
      p_voter_key: getVoterKey(),
    })

    if (data && data.ok === false && data.reason === 'already_voted') {
      setError('이 대진에는 이미 투표한 적 있어요. 표는 처음 것만 반영!')
    }
  }

  const nextBattle = () => {
    setVotedFor(null)
    setError('')
    if (mode === 'bonus') {
      const usedBonus = (session.bonus || 0) + 1
      const next = { ...session, bonus: usedBonus }
      setSession(next)
      saveSession(next)
      if (usedBonus >= BONUS_LIMIT) {
        setMode('daily') // 보너스 소진 → 마무리 화면으로
      } else {
        loadBonus()
      }
    } else {
      const next = { ...session, done: session.done + 1 }
      setSession(next)
      saveSession(next)
    }
  }

  const bonusUsed = session ? session.bonus || 0 : 0
  const bonusLeft = Math.max(0, BONUS_LIMIT - bonusUsed)

  const startBonus = () => {
    setMode('bonus')
    loadBonus()
  }

  if (loading) return <div className="loading">짠내 측정 중...</div>

  if (!storyMap) {
    return <div className="loading">{error || '대진 없음'}</div>
  }

  // ── 오늘의 판정 완료 화면 ──
  if (dailyComplete) {
    return (
      <div>
        <h1 className="page-title">오늘의 배틀</h1>
        <p className="page-sub">{todayDisplay()} 판정 결과</p>
        <div className="done-card">
          <div className="done-stamp">판정 완료</div>
          <p className="done-text">
            {bonusLeft > 0 ? (
              <>오늘의 {total}판, 배심원 수고하셨습니다.<br />내일 0시에 새 대진이 열립니다.</>
            ) : (
              <>오늘의 짠내는 여기까지.<br />내일 0시, 새 대진 {DAILY_COUNT}판과 함께 돌아오세요.</>
            )}
          </p>
          <div className="done-actions">
            <a href={OPEN_CHAT_URL} target="_blank" rel="noreferrer" className="btn btn-sticker">본부 입장 (오픈채팅)</a>
            <Link to="/ranking" className="btn">이번 주 순위</Link>
            <Link to="/submit" className="btn">내 사연도 접수</Link>
          </div>
          {bonusLeft > 0 && (
            <button className="btn-small done-bonus" onClick={startBonus}>
              아직 짠내가 고픈 분들을 위한 보너스 배틀 (오늘 {bonusLeft}판 남음) →
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!pair) {
    return (
      <div>
        <div className="loading">{error || '대진을 불러오는 중...'}</div>
      </div>
    )
  }

  const [a, b] = pair
  const totalVotes = votedFor ? a.win_count + b.win_count : 0
  const pctOf = (s) => (totalVotes > 0 ? Math.round((s.win_count / totalVotes) * 100) : 50)

  return (
    <div>
      <h1 className="page-title">오늘의 배틀</h1>
      <p className="page-sub">더 불쌍한 쪽을 누르세요. 판정은 냉정하게.</p>

      {mode === 'daily' ? (
        <div className="progress-row">
          <span>판정 {dailyDone + 1} / {total}</span>
          <span>{todayDisplay()}</span>
        </div>
      ) : (
        <div className="progress-row">
          <span>보너스 배틀</span>
          <span>{bonusUsed + 1} / {BONUS_LIMIT}</span>
        </div>
      )}
      {mode === 'daily' && (
        <div className="progress-track-top">
          <div className="progress-fill-top" style={{ width: `${(dailyDone / total) * 100}%` }} />
        </div>
      )}

      <div className="battle-grid">
        <ReceiptCard story={a} onVote={handleVote} voted={!!votedFor} isWinner={votedFor === a.id} pct={pctOf(a)} disabled={!!votedFor} />
        <div className="vs-badge">VS</div>
        <ReceiptCard story={b} onVote={handleVote} voted={!!votedFor} isWinner={votedFor === b.id} pct={pctOf(b)} disabled={!!votedFor} />
      </div>

      {error && <p className="hint">{error}</p>}

      <div className="battle-actions">
        {votedFor ? (
          <button className="btn btn-sticker" onClick={nextBattle}>
            {mode === 'bonus'
              ? (bonusUsed + 1 >= BONUS_LIMIT ? '오늘은 여기까지' : '다음 배틀 →')
              : (dailyDone + 1 >= total ? '판정 마치기' : '다음 배틀 →')}
          </button>
        ) : (
          <p className="hint">투표하면 결과가 공개됩니다</p>
        )}
      </div>
    </div>
  )
}
