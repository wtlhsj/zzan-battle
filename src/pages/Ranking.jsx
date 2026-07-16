import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Ranking() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    supabase.rpc('get_weekly_ranking', { p_limit: 20 }).then(({ data }) => {
      setRows(data || [])
    })
  }, [])

  if (!rows) return <div className="loading">이번 주 짠내 집계 중...</div>

  return (
    <div>
      <h1 className="page-title">이번 주 순위</h1>
      <p className="page-sub">
        매주 월요일 초기화. 일요일 밤, 1위에게 눈물의 국밥 기프티콘이 갑니다.
      </p>

      {rows.length === 0 ? (
        <div className="fame-empty">이번 주 투표가 아직 없어요. 첫 표의 주인공이 되어보세요.</div>
      ) : (
        <div className="rank-list">
          {rows.map((r, i) => (
            <div className={`rank-item ${i === 0 ? 'first' : ''}`} key={r.story_id}>
              {i === 0 && <span className="gukbap-badge">국밥 유력</span>}
              <span className="rank-no">{i + 1}</span>
              <div className="rank-body">
                <div className="rank-nick">{r.nickname}</div>
                <div className="rank-content">{r.content}</div>
              </div>
              <span className="rank-stat">
                {r.weekly_wins}승 / {r.weekly_battles}전
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
