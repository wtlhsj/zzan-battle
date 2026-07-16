import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Fame() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    supabase
      .from('hall_of_fame')
      .select('id, week_label, note, stories ( nickname, content )')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []))
  }, [])

  if (!rows) return <div className="loading">역대 국밥왕 소환 중...</div>

  return (
    <div>
      <h1 className="page-title">명예의 전당</h1>
      <p className="page-sub">눈물의 국밥을 받아간 역대 짠내왕들.</p>

      {rows.length === 0 ? (
        <div className="fame-empty">
          아직 초대 짠내왕이 없습니다.
          <br />
          이번 주 일요일 밤, 첫 국밥의 주인이 여기에 새겨집니다.
        </div>
      ) : (
        <div className="rank-list">
          {rows.map((r) => (
            <div className="rank-item first" key={r.id}>
              <span className="gukbap-badge">국밥 수령</span>
              <div className="rank-body">
                <div className="fame-week">{r.week_label}</div>
                <div className="rank-nick">{r.stories?.nickname}</div>
                <div className="rank-content">{r.stories?.content}</div>
                {r.note && <div className="fame-week" style={{ marginTop: 6 }}>{r.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
