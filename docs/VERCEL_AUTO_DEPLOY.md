# Vercel 자동 배포 설정 (main 푸시 → jeongsu-lms.vercel.app)

GitHub: `https://github.com/kmjh734-max/jeongsu-lms`

## 방법 A — 추천: Vercel ↔ GitHub 연결 (설정 한 번)

1. [Vercel Dashboard](https://vercel.com/dashboard) → 프로젝트 **jeongsu-lms** (또는 Import)
2. **Settings** → **Git**
3. **Connect Git Repository** → `kmjh734-max/jeongsu-lms` 선택
4. **Production Branch**: `main`
5. **Deploy Hooks** / 자동 배포: 기본 ON

이후 `main`에 `git push` 할 때마다 Vercel이 자동으로 빌드·배포합니다.  
(GitHub Actions 없이도 동작합니다.)

### 환경 변수 (프로덕션)

Vercel → **Settings** → **Environment Variables**:

| 이름 | 환경 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Production |

Supabase → **Authentication** → URL Configuration에  
`https://jeongsu-lms.vercel.app` 추가.

---

## 방법 B: GitHub Actions + Deploy Hook (A가 안 될 때)

1. Vercel → 프로젝트 → **Settings** → **Git** → **Deploy Hooks**
2. Name: `github-main`, Branch: `main` → URL 복사
3. GitHub → `jeongsu-lms` → **Settings** → **Secrets and variables** → **Actions**
4. **New repository secret**
   - Name: `VERCEL_DEPLOY_HOOK`
   - Value: (복사한 Deploy Hook URL)
5. `main`에 푸시 → Actions 워크플로 `Deploy to Vercel (Production)` 실행

워크플로 파일: `.github/workflows/deploy-production.yml`

---

## 배포 확인

- Vercel → **Deployments** 탭에서 최신 커밋·상태 확인
- 성공 후 https://jeongsu-lms.vercel.app 접속
