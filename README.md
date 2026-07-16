# 짠내배틀

누가 더 불쌍한지 투표로 정하는 사이트. 주간 1위에게 눈물의 국밥 기프티콘.

## 스택

- React + Vite (프론트)
- Supabase `zzan-battle` (백엔드: stories / votes / hall_of_fame + RPC)
- Vercel (배포)

## 배포 (최초 1회, 약 5분)

1. **GitHub 저장소 만들기**: github.com → New repository → 이름 `zzan-battle` → Create
2. **코드 올리기**: 저장소 페이지에서 "uploading an existing file" 클릭 → 이 폴더 안의 파일 전체를 드래그해서 업로드 → Commit
   (`node_modules`, `dist` 폴더는 올리지 않아도 됨 — zip에는 이미 빠져 있음)
3. **Vercel 연결**: vercel.com → Add New → Project → 방금 만든 `zzan-battle` 저장소 Import
   - Framework Preset: **Vite** (자동 감지됨)
   - 환경변수 설정 불필요 (키가 코드에 포함됨 — 공개용 키라 안전)
   - Deploy 클릭
4. 끝. `zzan-battle-xxxx.vercel.app` 주소가 발급됨. 이후 GitHub에 커밋할 때마다 자동 재배포.

## 운영 루틴

### 사연 검수 (수시)
유저가 제출한 사연은 `pending` 상태로 들어옴. Supabase 대시보드 → Table Editor → `stories` →
`status`가 `pending`인 행을 `approved`(등판) 또는 `rejected`(반려)로 변경.

### 주간 우승자 등록 (일요일 밤)
1. 이번 주 순위 페이지에서 1위 확인 (또는 SQL: `select * from get_weekly_ranking(5);`)
2. 국밥 기프티콘 발송 (연락 수단은 추후 카카오 로그인 붙이면 자동화 가능)
3. `hall_of_fame`에 행 추가: `week_label` 예시 `"2026년 7월 3주차"`, `story_id`는 우승 사연 id

## 주의

- `votes` 테이블은 클라이언트 직접 접근 불가 (RPC `cast_vote`로만, 중복투표 방지 내장)
- 사연 제출은 `pending`으로만 insert 가능 (RLS로 강제)
