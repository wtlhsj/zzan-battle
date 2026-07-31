// 유입 계측. 방문 1건을 visit_events에 남긴다.
//
// 왜 있나: 짠내배틀은 utm·ref를 어디서도 읽지 않아서, 땅모 허브가 붙여 보내는
// ?utm_source=hub 가 그대로 버려지고 있었다. 목적지 집계가 0인 상태였다.
//
// 설계 원칙
//  · **voter_key를 재사용하지 않는다.** comments 테이블이 RLS 정책 qual=true라
//    anon 키만으로 voter_key 목록을 외부에서 긁을 수 있다. 즉 voter_key는 비밀값이
//    아니고, 그걸 방문 로그 키로 쓰면 '수집 가능한 공개 식별자'로 유입-행동이 이어진다.
//    그래서 별도 익명 키를 쓴다.
//  · 기존 RPC·테이블 무접촉(expand-only). 새 함수 log_visit 하나만 부른다.
//  · 실패해도 앱에 영향이 없어야 한다. 전부 삼키고 조용히 끝낸다.
//  · localStorage가 막힌 환경(사파리 프라이빗 등)에서도 던지지 않는다.
//    참고: 같은 파일의 getVoterKey()에는 try/catch가 없다 — 여기서는 반복하지 않는다.

import { supabase } from './supabase'

const VISIT_KEY_STORAGE = 'zzan_visit_key'
const SOURCE_STORAGE = 'zzan_source'

/** 방문 식별용 익명 키. 투표 키와 완전히 별개다. */
function getVisitorKey() {
  try {
    let key = localStorage.getItem(VISIT_KEY_STORAGE)
    if (!key) {
      key = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      localStorage.setItem(VISIT_KEY_STORAGE, key)
    }
    return key
  } catch {
    // 저장이 막히면 이번 방문 한정 키로 남긴다(중복 억제만 못 받는다).
    return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  }
}

/**
 * 유입 출처를 최초 1회만 고정한다(sticky).
 * 카카오·네이버 인앱 브라우저는 document.referrer를 지워버려서, 첫 진입 URL에
 * 실려온 값을 붙잡아두지 않으면 이후 페이지에서 출처를 영영 알 수 없다.
 * (살까말까 tracking.ts와 같은 이유·같은 방식)
 */
function readAndPersistSource() {
  let fromUrl = null
  try {
    const p = new URLSearchParams(window.location.search)
    const raw = p.get('utm_source') ?? p.get('s')
    if (raw) fromUrl = raw.trim().slice(0, 32).toLowerCase()
  } catch {
    fromUrl = null
  }
  try {
    if (fromUrl) {
      localStorage.setItem(SOURCE_STORAGE, fromUrl)
      return fromUrl
    }
    return localStorage.getItem(SOURCE_STORAGE)
  } catch {
    return fromUrl
  }
}

/** 착지 1회 기록. 30분 내 같은 방문자·같은 경로는 서버가 알아서 걸러낸다. */
export function logVisit() {
  try {
    supabase
      .rpc('log_visit', {
        p_visitor_key: getVisitorKey(),
        p_source: readAndPersistSource(),
        p_referrer: document.referrer || null,
        p_path: window.location.pathname || '/',
      })
      .then(() => {})
      .catch(() => {})
  } catch {
    // 계측이 앱을 막지 않는다.
  }
}
