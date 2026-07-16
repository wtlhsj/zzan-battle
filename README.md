# 짠내배틀

누가 더 불쌍한지 투표로 정하는 사이트. 주간 1위에게 눈물의 국밥 기프티콘.

- 프로덕션: https://zzan-battle.vercel.app (공유는 반드시 이 주소로)
- GitHub `main` 푸시 → Vercel 자동 배포

## 스택

- React + Vite / Supabase `zzan-battle` (서울) / Vercel

## 페이지

- `/` 배틀 투표 · `/submit` 사연 접수 · `/ranking` 주간 순위 · `/fame` 명예의 전당
- `/studio` 운영자용 Threads 카드 생성기 (메뉴 비노출)

## 운영 루틴

- **사연 검수(수시)**: `stories`의 `pending` → `approved`/`rejected`. Claude 채팅에서 "사연 검수해줘"로 처리.
- **주간 정산(일요일 밤)**: "이번 주 국밥왕 정산해줘" → 1위 확인, 연락처(contact) 조회, `hall_of_fame` 등록. 기프티콘 발송만 수동.
- **Threads 카드(주 2~3회)**: `/studio`에서 대진 선택 → PNG 저장 → 업로드.

## 보안 메모

- `stories.contact`(우승 연락처)는 컬럼 단위 권한으로 클라이언트 조회 불가. 운영자만 SQL로 조회.
- `votes`는 RPC `cast_vote`로만 기록 (대진별 중복투표 방지 내장).
- 유저 제출은 RLS로 `pending` 상태만 허용.
