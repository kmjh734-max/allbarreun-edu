# 올바른교육(allbarreun-edu) — jeongsu-lms 와 완전 분리

이 문서는 **정수학원(jeongsu-lms)** 과 섞이지 않게 배포·연동을 나누는 방법입니다.

## 현재 분리 상태 (코드/ Git)

| 항목 | 올바른교육 | jeongsu (사용 금지) |
|------|------------|---------------------|
| GitHub | `kmjh734-max/allbarreun-edu` | `jeongsu-lms` |
| Supabase | `allbarreun-edu` 프로젝트 | 정수학원 DB |
| 내부 이메일 | `@allbarreun-edu-lms.local` | `@jslms.local` |
| Vercel (목표) | **새 프로젝트 `allbarreun-edu`** | `jeongsu-lms` |

로컬 폴더의 `.vercel` 은 **삭제됨** (jeongsu-lms CLI 연결 제거).

---

## 1. Vercel — jeongsu 와 분리 (대시보드에서 한 번만)

### A. jeongsu-lms 가 이 저장소를 배포하지 않게

1. [Vercel Dashboard](https://vercel.com/dashboard) → 프로젝트 **jeongsu-lms**
2. **Settings → Git**  
   - `allbarreun-edu` 저장소가 연결되어 있으면 **Disconnect**
3. (선택) jeongsu-lms 는 `jeongsu-lms` 저장소만 연결하거나 Git 연동 해제

### B. 올바른교육 전용 Vercel 프로젝트 만들기

1. **Add New Project** → Import **`kmjh734-max/allbarreun-edu`**
2. 프로젝트 이름: **`allbarreun-edu`** (jeongsu-lms 아님)
3. **Environment Variables** (Production + Preview + Development 동일):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://rihpgwkgaiqeffondwmr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=(allbarreun Supabase Publishable key)
   SUPABASE_SERVICE_ROLE_KEY=(allbarreun Supabase Secret key)
   NEXT_PUBLIC_SITE_URL=https://allbarreun-edu.vercel.app
   ```

   `NEXT_PUBLIC_SITE_URL` 은 첫 배포 후 실제 Vercel URL로 맞추세요.

4. **Deploy**

### C. Supabase Auth URL

**allbarreun-edu** Supabase → Authentication → URL Configuration:

```
Site URL: https://allbarreun-edu.vercel.app
Redirect URLs:
  https://allbarreun-edu.vercel.app/**
  http://localhost:3000/**
```

---

## 2. GitHub Secrets (jeongsu Hook 제거)

저장소 **allbarreun-edu** → Settings → Secrets:

- **삭제 또는 미사용:** `VERCEL_DEPLOY_HOOK` (jeongsu-lms 용이면)
- **추가 (Deploy Hook 쓸 때만):** `ALLBARREUN_VERCEL_DEPLOY_HOOK`  
  → Vercel **allbarreun-edu** 프로젝트에서 만든 Hook URL

Git 연동만 쓰면 Secret 없이도 `main` push 시 자동 배포됩니다.

---

## 3. 로컬 CLI로 배포할 때

```bash
# jeongsu 연결 제거 후 (이미 .vercel 삭제됨)
npx vercel link
# → 프로젝트 선택: allbarreun-edu (jeongsu-lms 선택 금지)

npx vercel --prod
```

---

## 4. 확인 체크리스트

- [ ] `git remote -v` → `allbarreun-edu.git` 만 표시
- [ ] Vercel **allbarreun-edu** 프로젝트 Production URL 접속 시 올바른교육 로그인 화면
- [ ] 로그인 시 **allbarreun** Supabase 계정으로 동작 (정수 DB 데이터 안 보임)
- [ ] `jeongsu-lms.vercel.app` 에 이번 커밋이 반영되지 않음
