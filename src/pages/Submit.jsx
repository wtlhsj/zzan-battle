import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { randomNickname, containsBanned } from '../lib/nickname'
import { OPEN_CHAT_URL } from '../lib/config'

const MAX_LEN = 200

export default function Submit() {
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    const nick = nickname.trim()
    const body = content.trim()

    if (nick.length < 1 || nick.length > 12) {
      setMsg({ type: 'err', text: '닉네임은 1~12자로 적어주세요.' })
      return
    }
    if (body.length < 5) {
      setMsg({ type: 'err', text: '사연이 너무 짧아요. 다섯 글자는 넘겨주세요.' })
      return
    }
    if (body.length > MAX_LEN) {
      setMsg({ type: 'err', text: `사연은 ${MAX_LEN}자까지예요. 짠내는 압축할수록 진해집니다.` })
      return
    }
    if (containsBanned(nick) || containsBanned(body)) {
      setMsg({ type: 'err', text: '표현을 조금만 순화해주세요. 짠내배틀은 온 가족이 봅니다.' })
      return
    }

    setSending(true)
    const code = '국밥' + Math.floor(1000 + Math.random() * 9000)
    const { error } = await supabase.from('stories').insert({
      nickname: nick,
      content: body,
      claim_code: code,
    })
    setSending(false)

    if (error) {
      setMsg({ type: 'err', text: '접수에 실패했어요. 잠시 후 다시 시도해주세요.' })
    } else {
      setMsg({
        type: 'ok',
        text: `접수 완료! 당신의 수령 코드는 [${code}] — 우승하면 본부(오픈채팅)에서 본부장에게 이 코드를 보내 국밥을 수령합니다. 지금 캡처해두세요!`,
      })
      setNickname('')
      setContent('')
    }
  }

  return (
    <div>
      <h1 className="page-title">사연 접수</h1>
      <p className="page-sub">200자 안에 당신의 짠내를 증명하세요.</p>

      <div className="guideline">
        짠내배틀은 <strong>웃을 수 있는 불행만</strong> 접수합니다. 빚 독촉, 건강 문제, 진짜 눈물 나는
        사연은 국밥이 아니라 도움이 필요해요. 여기는 '어이없어서 웃긴 가난' 전문입니다.
        구체적인 숫자가 들어가면 더 웃깁니다. (예: 잔고 3,847원)
      </div>

      <div className="form">
        <div className="field">
          <label htmlFor="nick">닉네임</label>
          <div className="nick-row">
            <input
              id="nick"
              type="text"
              maxLength={12}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 3일부자"
            />
            <button type="button" className="btn-small" onClick={() => setNickname(randomNickname())}>
              대충 지어줘
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="story">사연</label>
          <textarea
            id="story"
            rows={5}
            maxLength={MAX_LEN}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="예: 배달비 아까워서 직접 갔다가 오는 길에 붕어빵 삼천원어치 삼"
          />
          <div className="char-count">{content.length} / {MAX_LEN}</div>
          <p className="field-note">욕설·비방·광고·사이트와 무관한 내용은 검수에서 반려됩니다.</p>
        </div>

        <div className="field">
          <label>국밥 수령 안내</label>
          <p className="field-note" style={{ marginTop: 0 }}>
            접수 완료 시 발급되는 <strong>수령 코드</strong>가 우승 인증 수단입니다.
            국밥 수령은{' '}
            <a href={OPEN_CHAT_URL} target="_blank" rel="noreferrer">짠내배틀 본부(오픈채팅)</a>
            에서만 진행됩니다.
          </p>
        </div>

        <button className="btn btn-sticker" onClick={handleSubmit} disabled={sending}>
          {sending ? '접수 중...' : '짠내 접수'}
        </button>

        {msg && <p className={`form-msg ${msg.type}`}>{msg.text}</p>}
        <p className="field-note" style={{ marginTop: 12 }}>
          모든 사연은 검수 후 배틀에 등판합니다. 자세한 처리 기준은{' '}
          <a href="/privacy">개인정보처리방침</a>을 참고하세요.
        </p>
      </div>
    </div>
  )
}
