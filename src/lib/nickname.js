// 여러 풀에서 뽑고 30% 확률로 숫자 — 조작 티 안 나게 단순하게
const POOLS = [
  // 음식
  ['국밥', '컵라면', '삼각김밥', '붕어빵', '쌈장', '누룽지', '단무지', '건빵'],
  // 사물
  ['전기장판', '적금통장', '교통카드', '보조배터리', '영수증', '슬리퍼', '우산없음'],
  // 상태
  ['무지출', '텅장', '월세인', '재택희망', '존버중', '반차각', '칼퇴빌런'],
  // 성의없음
  ['ㅇㅇ', 'ㅁㄴㅇㄹ', '지나가던사람', '익명', '아무개', '행인1'],
]

export function randomNickname() {
  const pool = POOLS[Math.floor(Math.random() * POOLS.length)]
  let name = pool[Math.floor(Math.random() * pool.length)]
  if (name.length <= 6 && Math.random() < 0.3) {
    name += Math.floor(Math.random() * 99) + 1
  }
  return name
}

// 최소한의 비속어/부적절 단어 필터 (제출 차단용)
const BANNED = [
  'ㅅㅂ', 'ㅆㅂ', 'ㅈㄴ', 'ㅈㄹ', 'ㄲㅈ', 'ㅄ', 'ㅂㅅ',
  '시발', '씨발', '병신', '존나', '지랄', '개새', '좆', '썅',
  '자살', '죽고싶', '죽을래', '한강',
]

export function containsBanned(text) {
  const normalized = text.replace(/\s/g, '')
  return BANNED.some((w) => normalized.includes(w))
}
