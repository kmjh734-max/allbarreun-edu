# 올바른교육 LMS (MVP)

올바른교육 전용 LMS입니다. 강사는 Vimeo·YouTube에 영상을 업로드한 뒤 **링크만 입력**합니다 (Vimeo API 업로드 없음).

> **학원 브랜드 변경:** `src/config/academy.ts`만 수정하면 학원명·로그인 문구·내부 이메일 도메인·로고·대표 색상을 한곳에서 바꿀 수 있습니다.

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
│   ├── config/
│   │   └── academy.ts                # 학원별 브랜드·인증 설정
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
│   │   │   ├── students/page.tsx     # 강좌 배정
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
| `/login` | 공개 | 이메일·아이디 로그인 |
| `/admin` | admin | 관리자 대시보드 |
| `/admin/courses` | admin | 강좌 목록·생성·수정 |
| `/admin/students` | admin | 학생 강좌 배정 |
| `/admin/teachers` | admin | 강사 목록 |
| `/admin/classes` | admin | 반 관리 |
| `/teacher` | teacher | 담당 강좌 |
| `/teacher/courses/[id]` | teacher | 단원·강의·Vimeo·YouTube·PDF |
| `/teacher/classes` | teacher | 반 관리 |
| `/student` | student | 수강 강좌 + 진도율 |
| `/student/courses/[id]` | student | 강의 목록 |
| `/student/courses/[id]/lessons/[id]` | student | 영상 시청·완료·자료 |

## 역할별 리다이렉트

1. **middleware** (`src/middleware.ts`): 미로그인 → `/login`, 로그인 후 `/`·`/login` → 역할 대시보드
2. **LoginForm**: 로그인 성공 시 `profiles.role` → `/admin` \| `/teacher` \| `/student`
3. **auth/callback**: OAuth 코드 교환 후 동일 로직
4. **권한 분기**: `/admin`, `/teacher`, `/student` 접두사는 해당 role만 허용

---

## 새 학원용 GitHub 연결 방법

이 폴더는 다른 학원 LMS를 복제한 것입니다. **기존 학원 GitHub 저장소와 섞이지 않도록** 새 저장소에만 연결하세요.

1. **현재 연결된 원격 저장소 확인**

   ```bash
   git remote -v
   ```

2. **기존 학원 저장소가 연결되어 있으면 제거** (예: `jeongsu-lms`)

   ```bash
   git remote remove origin
   ```

3. **GitHub에서 새 학원용 repository 생성**  
   예: `allbarreun-edu-lms`

4. **새 저장소 연결**

   ```bash
   git remote add origin https://github.com/내아이디/새저장소명.git
   ```

5. **main 브랜치 설정**

   ```bash
   git branch -M main
   ```

6. **새 저장소로 push**

   ```bash
   git add .
   git commit -m "Initialize academy LMS clone"
   git push -u origin main
   ```

### 주의

- **기존 `jeongsu-lms` 등 이전 학원 저장소에 실수로 push하지 마세요.**
- push 전에 반드시 `git remote -v`로 연결 대상을 확인하세요.

---

## 새 학원용 Supabase 세팅 방법

복제본은 **기존 학원 Supabase 프로젝트를 사용하면 안 됩니다.** 학원마다 Supabase 프로젝트를 새로 만드세요.

1. [Supabase](https://supabase.com)에서 **새 프로젝트** 생성
2. SQL Editor에서 `supabase/migrations/` 폴더의 migration SQL을 **파일 번호 순서대로** 실행
3. Table Editor에서 아래 테이블이 생성되었는지 확인
   - `profiles`
   - `courses`
   - `sections`
   - `lessons`
   - `enrollments`
   - `lesson_progress`
   - `classes`
   - `class_students`
   - `class_courses`
4. **Authentication**에서 최초 관리자 계정 생성 (이메일/비밀번호)
5. Table Editor → `profiles`에서 해당 계정 `role`을 `admin`으로 변경
6. **Project Settings → API Keys**에서 아래 값 복사
   - Project URL
   - Publishable key (anon)
   - Secret key (service_role)
7. 프로젝트 루트에 `.env.local` 생성 후 새 값 입력

```env
NEXT_PUBLIC_SUPABASE_URL=새_학원_Supabase_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=새_학원_publishable_key
SUPABASE_SERVICE_ROLE_KEY=새_학원_secret_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local.example`를 복사해 시작할 수 있습니다.

### 주의

- **기존 정수학원·이전 학원 Supabase URL/key를 그대로 쓰면 안 됩니다.**
- 새 학원은 반드시 **새 Supabase 프로젝트**를 사용해야 합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 **GitHub에 절대 올리지 마세요.**
- `.env.local`은 `.gitignore`에 포함되어 있어야 합니다 (이 프로젝트에 포함됨).

---

## 새 학원용 Vercel 배포 방법

> **jeongsu-lms 와 분리:** [docs/ALLBARREUN_DEPLOY.md](docs/ALLBARREUN_DEPLOY.md) 필독 (기존 Vercel 프로젝트에 연결되지 않게)

1. [Vercel Dashboard](https://vercel.com) → **Add New Project**
2. **새 학원용 GitHub 저장소** Import (위에서 연결한 저장소)
3. **Environment Variables**에 새 Supabase 값 3개 입력
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. (권장) `NEXT_PUBLIC_SITE_URL` = 배포 후 사이트 URL (og:image용)
5. **Deploy**
6. 배포 주소 확인 (예: `https://allbarreun-edu-lms.vercel.app`)
7. **Supabase → Authentication → URL Configuration**에 Vercel 주소 추가

**Site URL 예:**

```
https://새프로젝트명.vercel.app
```

**Redirect URLs 예:**

```
https://새프로젝트명.vercel.app/**
http://localhost:3000/**
http://localhost:3001/**
```

배포 후 `.env.local`의 `NEXT_PUBLIC_SITE_URL`도 동일한 프로덕션 URL로 맞추면 SNS 미리보기(og:image)가 올바르게 동작합니다.

자동 배포(Git push → Vercel) 설정은 [docs/VERCEL_AUTO_DEPLOY.md](docs/VERCEL_AUTO_DEPLOY.md)를 참고하세요. 문서 안의 저장소·프로젝트 이름은 **새 학원용으로 바꿔** 사용하세요.

---

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local
# .env.local에 새 Supabase 값 입력
npm run dev
```

## MVP 기능 체크리스트

- [x] 로그인 및 역할 구분 (`profiles.role`)
- [x] 관리자/강사/학생 대시보드
- [x] 아이디 로그인 (내부 `@allbarreun-edu-lms.local` — `academy.ts`에서 변경 가능)
- [x] 강좌 생성·강사 배정·공개 설정
- [x] 단원 생성
- [x] 강의 등록 (Vimeo·YouTube 링크 → 영상 ID 추출 저장)
- [x] Vimeo·YouTube iframe 재생
- [x] PDF Storage 업로드
- [x] 학생 강좌 배정 (`enrollments`)
- [x] 반 관리·강좌 일괄 배정
- [x] 수강 완료 (`lesson_progress`)
- [x] 강좌별 진도율 (`calculateCourseProgress`)
- [x] RLS 권한 분기

## 진도율 계산

공개된 강의(`is_published = true`) 수를 분모로, 해당 학생의 `lesson_progress.is_completed = true` 개수를 분자로 사용합니다.

```ts
progressPercent = round((completed / total) * 100)
```

구현: `src/lib/progress/calculate.ts`
