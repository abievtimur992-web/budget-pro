# Budget PRO Family

Бұл проект React + TypeScript ҳәм Vite арқалы жазылған.

## Орнатыў ҳәм іске қосыў

Усы компьютерде `node` ямаса `npm` орнатылмаған болыўы мүмкин. Проектті ислетиў ушын:

1. [Node.js](https://nodejs.org) жүктеп алып, орнатыңыз.
2. Терминалды ашып, усы папкаға кириңиз:
   ```cmd
   cd C:\Users\User\.gemini\antigravity\scratch\budget-pro-family
   ```
3. Төмендеги командаларды орынлаңыз:
   ```cmd
   npm install
   npm install react-router-dom zustand lucide-react i18next react-i18next clsx tailwind-merge
   npm install -D tailwindcss postcss autoprefixer
   npm run dev
   ```
4. Браузерде көрсетілген сілтемеге (әдетте http://localhost:5173) кириңиз.

## Архитектуралық ерекшеликлер (Phase 1)
- **i18n:** Текстлер `src/locales/kk.json` ишинде сақланады. UI компонентлеринде hardcode жоқ.
- **Family-based model:** `src/types/index.ts` файлында `Family`, `User`, `Account`, `Budget` интерфейслери анықланған. Ҳәр бир транзакция `familyId` менен байланысады.
- **Service Layer:** `src/services/budgetEngine.ts` файлында математикалық есаплаў логикасы орналасқан.
- **Zustand Persistence:** Ҳәзирше мағлыўмат `localStorage` ишинде сақланады, бирақ `src/store/useFinanceStore.ts` файлы арқалы оны Supabase API менен алмастырыў аңсат.

## Жасалған беттер
1. **Onboarding** - Шаңарақ атын ҳәм пайдаланыўшыны киритиў.
2. **Dashboard** - Жалпы баланс, кирис/шығыс қосыў, ҳәм айлық прогрессти көриў.
3. **Responsive Navigation** - Компьютерде Sidebar, телефонда Bottom Navigation болады.
