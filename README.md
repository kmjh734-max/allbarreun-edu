# English Academy LMS (MVP)

영어학원 전용 LMS MVP입니다. 강사는 Vimeo에 직접 영상을 업로드한 뒤 **링크만 입력**합니다 (Vimeo API 업로드 없음).

## 기술 스택

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, DB, Storage, RLS)
- Vercel 배포

## 폴더 구조

```
video-app/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # 테이블 + RLS + Storage
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # 역할별 대시보드로 redirect
│   │   ├── globals.css
│   │   ├── (auth)/login/page.tsx
│   │   ├── auth/callback/route.ts    # OAuth 후 role redirect
│   │   ├── admin/                    # 관리자
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [courseId]/page.tsx
│   │   │   ├── students/page.tsx     # 과정 배정
│   │   │   └── teachers/page.tsx
│   │   ├── teacher/                  # 강사
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── courses/[courseId]/page.tsx  # 단원·강의 등록
│   │   └── student/                  # 학생
│   │       ├── layout.tsx
│   │       ├── page.tsx              # 진도율 카드
│   │       └── courses/
│   │           ├── [courseId]/page.tsx
│   │           └── [courseId]/lessons/[lessonId]/page.tsx
│   ├── components/
│   │   ├── admin/     CourseForm, EnrollmentForm
│   │   ├── auth/      LoginForm
│   │   ├── layout/    DashboardNav, SignOutButton
│   │   ├── lessons/   CompleteLessonButton
│   │   ├── teacher/   SectionForm, LessonForm
│   │   ├── ui/        ProgressBar
│   │   └── vimeo/     VimeoPlayer
│   ├── lib/
│   │   ├── auth/      roles.ts, get-profile.ts
│   │   ├── progress/  calculate.ts
│   │   ├── supabase/  client, server, middleware
│   │   └── vimeo/     parse-url.ts
│   ├── types/database.ts
│   └── middleware.ts                 # 로그인 + role 경로 보호
├── .env.local.example
└── package.json
```

## Next.js 라우트 구조

| 경로 | 역할 | 설명 |
|------|------|------|
| `/login` | 공개 | 이메일 로그인 |
| `/admin` | admin | 관리자 대시보드 |
| `/admin/courses` | admin | 과정 목록·생성·수정 |
| `/admin/students` | admin | 학생 과정 배정 |
| `/admin/teachers` | admin | 강사 목록 |
| `/teacher` | teacher | 담당 과정 |
| `/teacher/courses/[id]` | teacher | 단원·강의·Vimeo·PDF |
| `/student` | student | 수강 과정 + 진도율 |
| `/student/courses/[id]` | student | 강의 목록 |
| `/student/courses/[id]/lessons/[id]` | student | 영상 시청·완료·자료 |

## 역할별 리다이렉트

1. **middleware** (`src/middleware.ts`): 미로그인 → `/login`, 로그인 후 `/`·`/login` → 역할 대시보드
2. **LoginForm**: 로그인 성공 시 `profiles.role` → `/admin` \| `/teacher` \| `/student`
3. **auth/callback**: OAuth 코드 교환 후 동일 로직
4. **권한 분기**: `/admin`, `/teacher`, `/student` 접두사는 해당 role만 허용

## Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 실행
3. Authentication → Email 활성화
4. Storage 버킷 `course-materials` (마이그레이션에 포함)
5. `.env.local` 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 첫 관리자 계정

1. Authentication에서 사용자 생성 (이메일/비밀번호)
2. Table Editor → `profiles`에서 해당 사용자 `role`을 `admin`으로 수정

강사: `role = teacher`  
학생: 가입 시 기본 `student` (metadata `role`로 지정 가능)

## 로컬 실행

```bash
npm install
npm run dev
```

## Vercel 배포 (자동)

`main` 브랜치에 푸시하면 프로덕션에 자동 배포되도록 설정합니다.

**한 번만 설정:** [docs/VERCEL_AUTO_DEPLOY.md](docs/VERCEL_AUTO_DEPLOY.md) 참고

1. Vercel에서 GitHub 저장소 `kmjh734-max/jeongsu-lms` 연결 (Production Branch: `main`)
2. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Supabase Auth URL에 `https://jeongsu-lms.vercel.app` 추가
4. 이후 `git push origin main` → Vercel Deployments에 새 빌드 표시

(대안) GitHub Actions Deploy Hook: `.github/workflows/deploy-production.yml` + Secret `VERCEL_DEPLOY_HOOK`

## MVP 기능 체크리스트

- [x] 로그인 및 역할 구분 (`profiles.role`)
- [x] 관리자/강사/학생 대시보드
- [x] 과정 생성·강사 배정·공개 설정
- [x] 단원 생성
- [x] 강의 등록 (Vimeo 링크 → `vimeo_video_id` 추출 저장)
- [x] Vimeo iframe 재생 (`VimeoPlayer`)
- [x] PDF Storage 업로드
- [x] 학생 과정 배정 (`enrollments`)
- [x] 수강 완료 (`lesson_progress`)
- [x] 과정별 진도율 (`calculateCourseProgress`)
- [x] RLS 권한 분기

## 진도율 계산

공개된 강의(`is_published = true`) 수를 분모로, 해당 학생의 `lesson_progress.is_completed = true` 개수를 분자로 사용합니다.

```ts
progressPercent = round((completed / total) * 100)
```

구현: `src/lib/progress/calculate.ts`
