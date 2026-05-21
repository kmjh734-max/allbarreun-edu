# Vercel 자동 배포 설정 (main 푸시 → 프로덕션)

> **새 학원 복제본:** 아래 `저장소`, `프로젝트명`, `배포 URL`을 **새 학원용 GitHub·Vercel 프로젝트**로 바꿔 사용하세요. 기존 `jeongsu-lms` 등 이전 학원 프로젝트와 연결하지 마세요.

GitHub: `https://github.com/내아이디/새저장소명`

## 1. Vercel ↔ GitHub 연결

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project** 또는 기존 프로젝트
2. **Import** → 새 학원용 GitHub 저장소 선택
3. **Connect Git Repository** → 새 저장소 선택
4. **Production Branch**: `main`
5. Environment Variables (Supabase 3종 + 권장 `NEXT_PUBLIC_SITE_URL`)

## 2. Supabase Auth URL

배포 URL 확정 후 Supabase **Authentication → URL Configuration**:

- Site URL: `https://새프로젝트명.vercel.app`
- Redirect URLs: `https://새프로젝트명.vercel.app/**`, `http://localhost:3000/**`

## 3. 배포 큐 정리 (선택)

1. Vercel Deployments → 오래된 `Queued` / `Canceled` 배포 **Cancel** (최신 1개만 유지)

## 4. GitHub Actions Deploy Hook (대안)

`.github/workflows/deploy-production.yml` 사용 시:

1. Vercel → Project → Settings → Git → Deploy Hooks → Production hook URL 복사
2. GitHub → 새 저장소 → **Settings** → **Secrets** → `VERCEL_DEPLOY_HOOK` 등록
3. `main` push 시 hook으로 배포

## 5. 확인

- `git push origin main` 후 Vercel Deployments에 새 빌드 표시
- 성공 후 프로덕션 URL 접속·로그인 테스트
