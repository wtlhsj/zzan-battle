import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, getVoterKey } from '../lib/supabase'

const MAX = 80

// add_comment 실패 error → 사용자 문구 (RPC 계약과 1:1)
const ADD_ERRORS = {
  tone: '위로가 담긴 말로 바꿔주세요 🍲',
  too_long: '80자까지 쓸 수 있어요',
  limit: '한 사연에 위로는 3개까지예요',
  story_closed: '종료된 배틀에는 위로를 남길 수 없어요',
  empty: '잠시 후 다시 시도해주세요',
  invalid_key: '잠시 후 다시 시도해주세요',
}

// 익명 댓글 스레드 — 사연 카드 하단에 접힌 상태로 붙는다.
// voter_key는 기존 투표용 익명 키를 그대로 재사용.
export default function CommentThread({ storyId, storyName }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [comments, setComments] = useState([])
  const [commentable, setCommentable] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [menuFor, setMenuFor] = useState(null)

  const voterKey = getVoterKey()
  const empathyInFlight = useRef(new Set())

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('get_comments', {
      p_story_id: storyId,
      p_voter_key: voterKey,
    })
    if (!err && data && data.ok) {
      setComments(data.comments || [])
      setCommentable(data.commentable !== false)
    }
    setLoaded(true)
  }, [storyId, voterKey])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!flash) return undefined
    const t = setTimeout(() => setFlash(''), 2500)
    return () => clearTimeout(t)
  }, [flash])

  const count = comments.length

  const submit = async () => {
    const body = draft.trim()
    setError('')
    if (!body) return
    if (body.length > MAX) { setError(ADD_ERRORS.too_long); return }
    setSending(true)
    const { data, error: err } = await supabase.rpc('add_comment', {
      p_story_id: storyId,
      p_voter_key: voterKey,
      p_content: body,
    })
    setSending(false)
    if (err || !data) { setError('잠시 후 다시 시도해주세요'); return }
    if (data.ok === false) { setError(ADD_ERRORS[data.error] || '잠시 후 다시 시도해주세요'); return }
    setDraft('')
    await load() // 베스트/정렬은 서버가 다시 계산하므로 재조회
  }

  const toggleEmpathy = async (c) => {
    // 같은 댓글 연타는 무시 — 응답 순서가 꼬여 카운트가 어긋나는 것 방지
    if (empathyInFlight.current.has(c.id)) return
    empathyInFlight.current.add(c.id)
    // 낙관적 업데이트
    setComments((prev) => prev.map((x) => (x.id === c.id
      ? { ...x, my_empathy: !x.my_empathy, empathy_count: x.empathy_count + (x.my_empathy ? -1 : 1) }
      : x)))
    try {
      const { data, error: err } = await supabase.rpc('toggle_comment_empathy', {
        p_comment_id: c.id,
        p_voter_key: voterKey,
      })
      if (err || !data || data.ok === false) {
        // 실패 시 원복
        setComments((prev) => prev.map((x) => (x.id === c.id
          ? { ...x, my_empathy: c.my_empathy, empathy_count: c.empathy_count } : x)))
        return
      }
      // 서버값으로 동기화
      setComments((prev) => prev.map((x) => (x.id === c.id
        ? { ...x, my_empathy: data.added, empathy_count: data.empathy_count } : x)))
    } finally {
      empathyInFlight.current.delete(c.id)
    }
  }

  const report = async (c) => {
    setMenuFor(null)
    const { data, error: err } = await supabase.rpc('report_comment', { p_comment_id: c.id, p_voter_key: voterKey })
    setFlash(err || !data || data.ok === false ? '신고하지 못했어요' : '신고했어요')
  }

  const remove = async (c) => {
    setMenuFor(null)
    const idx = comments.findIndex((x) => x.id === c.id)
    setComments((p) => p.filter((x) => x.id !== c.id)) // 낙관적 제거
    const { data, error: err } = await supabase.rpc('delete_own_comment', {
      p_comment_id: c.id,
      p_voter_key: voterKey,
    })
    if (err || !data || data.ok === false) {
      // 실패 시 원래 자리에 복원 — 그 사이 일어난 다른 변경은 보존
      setComments((p) => {
        if (p.some((x) => x.id === c.id)) return p
        const copy = [...p]
        copy.splice(Math.max(0, Math.min(idx, copy.length)), 0, c)
        return copy
      })
      setFlash('삭제하지 못했어요')
    }
  }

  return (
    <div className="cmt">
      <button
        className="cmt-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${storyName} 사연의 익명 댓글 ${count}개`}
      >
        익명 댓글 {count}개 💬
      </button>

      {open && (
        <div className="cmt-panel">
          {!loaded ? (
            <p className="cmt-empty">불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="cmt-empty">아직 위로가 없어요. 첫 국밥러가 되어주세요</p>
          ) : (
            <ul className="cmt-list">
              {comments.map((c) => {
                const canDelete = c.is_mine
                const canReport = !c.is_mine && !c.hidden
                return (
                  <li key={c.id} className={`cmt-item${c.hidden ? ' hidden' : ''}`}>
                    <div className="cmt-line">
                      <span className="cmt-name">{c.display_name}</span>
                      {c.is_best && <span className="cmt-best">BEST</span>}
                    </div>
                    <div className="cmt-content">{c.content}</div>
                    <div className="cmt-actions">
                      {!c.hidden && (
                        <button
                          className={`cmt-empathy${c.my_empathy ? ' on' : ''}`}
                          onClick={() => toggleEmpathy(c)}
                          aria-pressed={c.my_empathy}
                        >
                          🍲 {c.empathy_count}
                        </button>
                      )}
                      {(canDelete || canReport) && (
                        <div className="cmt-menu-wrap">
                          <button
                            className="cmt-more"
                            onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}
                            aria-label="더보기"
                          >
                            ⋯
                          </button>
                          {menuFor === c.id && (
                            <div className="cmt-menu">
                              {canDelete
                                ? <button onClick={() => remove(c)}>삭제</button>
                                : <button onClick={() => report(c)}>신고</button>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {commentable ? (
            <div className="cmt-input">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
                placeholder="한 줄 위로 남기기 (80자)"
                rows={2}
                maxLength={MAX}
              />
              <div className="cmt-input-foot">
                <span className="cmt-count">{draft.length}/{MAX}</span>
                <button
                  className="btn-small cmt-send"
                  onClick={submit}
                  disabled={sending || !draft.trim()}
                >
                  {sending ? '전하는 중...' : '위로 전하기'}
                </button>
              </div>
              {error && <p className="cmt-error">{error}</p>}
            </div>
          ) : (
            <p className="cmt-closed">종료된 배틀 — 위로는 읽기만 가능해요</p>
          )}

          {flash && <p className="cmt-flash">{flash}</p>}
        </div>
      )}
    </div>
  )
}
