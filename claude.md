# Projekt: 360AITech - AI Poslovni Asistent in B2B Avtomatizacija

## 🚀 Pregled projekta (Project Overview)
**360AITech** je napredna B2B SaaS platforma za podjetja, ki omogoča avtomatizacijo poslovnih procesov, upravljanje baze znanja, iskanje po dokumentaciji (RAG) ter integracijo z AI modeli. 

Aplikacija mora biti zgrajena izjemno modularno, varno ter prilagojena za večjezično mednarodno uporabo.

---

## 🎯 Glavni primeri uporabe (Core Use Cases)
1. **E-pošta & Komunikacija:** Avtomatsko analiziranje, sestavljanje odgovorov in priprava osnutkov prek Google Mail / Google API integracije.
2. **Onboarding (Novozaposleni):** Pametni asistent za interaktivno vodenje novozaposlenih skozi interna navodila in procese podjetja.
3. **Internal Support (Pomoč pri uporabi):** Hitro odgovarjanje na vprašanja zaposlenih glede internih orodij in delovnih potekov.
4. **Pravni & Zakonodajni asistent:** Iskanje in analiza po zakonodaji, uradnih listih ter internih pravilnikih podjetja.
5. **Generiranje dokumentov:** Avtomatsko pisanje ponudb, pogodb in predlog na osnovi internih pravilnikov ter podlag.

---

## 🛠 Tehnološki sklad (Tech Stack)
- **Orodje / Jezik:** **TypeScript** (Strogo tipizirano za manj napak, lažje vzdrževanje in boljšo podporo pri AI generiranju kode).
- **Framework:** Next.js (App Router, React, Server Actions).
- **Stiliranje & UI:** Tailwind CSS, Shadcn UI (Moderen B2B SaaS izgled, podpora za **Dark Mode** / Svetel način).
- **Gostovanje & Deployment:** Vercel (Production veja: `main`).
- **Verzioniranje:** GitHub.
- **Baza podatkov & Vektorji:** Supabase (PostgreSQL + pgvector).
- **AI Modeli:** Primarno **Anthropic Claude API** (Claude 3.5 Sonnet za kompleksno logiko) ter **Google Gemini API** (Gemini 1.5 Flash za hitre/cenejše operacije in obdelavo dokumentov).
- **Integracije:** Google Workspace API (Google Drive, Gmail API), Supabase Auth.

---

## 🔐 Avtentikacija, Pravice in Multi-Tenancy (RBAC)
1. **Prijave:** Omogočena prijava/registracija preko Google OAuth ter klasična prijava z e-pošto in geslom (tudi lastne domene podjetij).
2. **Struktura Organizacij (Multi-Tenancy):**
   - Vsako registrirano podjetje predstavlja svojo ločeno organizacijo (Tenant).
   - Podatki podjetij morajo biti strogo ločeni (Row Level Security v Supabase).
3. **Vloge uporabnikov (User Roles):**
   - **Admin (Glavni uporabnik):** Upravlja naročnino podjetja, dodaja/odstranjuje uporabnike, nastavlja pravice in dostope.
   - **User (Zapolseni):** Koriščenje funkcionalnosti, ki mu jih odobri Admin.
   - **Custom Roles:** Možnost omejevanja dostopa do specifičnih modulov (npr. samo E-pošta ali samo Zakonodaja).

---

## 🌐 Večjezičnost (i18n - Internationalization)
Aplikacija mora biti od prvega dne zasnovana večjezično!
- **Privzeti jezik (Default):** Angleščina (`en`).
- **Podprti jeziki za začetek:** Angleščina (`en`), Slovenščina (`sl`), Nemščina (`de`), Francoščina (`fr`), Španščina (`es`).
- **Pravilo:** Vsi statični teksti, gumbi, naslovi, napake, opozorila in sistemska sporočila morajo biti izdelek datotek s prevodi (npr. `messages/sl.json`, `messages/en.json` z uporabo `next-intl` ali sorodne knjižnice). V kodi ne sme biti "hardcoded" tekstov.

---

## 💾 Upravljanje baze podatkov in Migracije (Database Rules)
Da ne prihaja do podvajanja ali rušenja baze:
1. **Struktura migracij:** Vse SQL skripte za kreiranje tabel, funkcij in indeksov se shranjujejo v mapo `/supabase/migrations/`.
2. **Izvajanje:**
   - Vsaka nova sprememba baze mora imeti svojo ločeno, časovno označeno SQL datoteko (npr. `20260722_init_schema.sql`).
   - Skripte morajo biti napisane idempotentno (uporaba `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... END $$`), da se lahko varno pognajo brez podvajanja podatkov.

---

## 📁 Hibridno Shranjevanje Dokumentov (Storage)
Podjetja bodo imela na izbiro dve opciji shranjevanja podatkov in dokumentov za RAG:
1. **Lokalni / Lastni strežnik podjetja** (S3 kompatibilno hrambo / Private Cloud).
2. **Google Cloud / Google Drive integracija** (povezava z obstoječim računom podjetja).

---

## 📐 Navodila za Claude (AI Developer Instructions)
1. **Jezik odzivanja:** Vse obrazložitve, komentarje v kodi in odgovore razvijalcu piši v **slovenskem jeziku**.
2. **Kakovost kode:** Piši moderno TypeScript kodo za Next.js App Router.
3. **Varnost:** Občutljivi API ključi morajo biti izključno v `.env.local` in se nikoli ne smejo izpostaviti na odjemalski strani (client-side).
4. **Streaming:** Odgovori jezikovnih modelov se morajo uporabniku prikazovati sproti (Streaming UI).
5. **Dark Mode:** Pri izdelavi UI komponent vedno uporabi Tailwind razrede za svetel in temen način (npr. `bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100`).

---

## ⏸️ Odloženo za kasneje (Deferred)
Namenoma še ni prioriteta — najprej se gradijo dejanske funkcionalnosti (core use cases):
1. **Menjava AI providerja:** Chat template trenutno še uporablja OpenAI namesto Claude/Gemini. Zamenjava se naredi kasneje, ko bo jasno, katere module dejansko potrebujemo.
2. **Predstavitvena spletna stran (marketing/landing page):** Vizualna/predstavitvena stran za javnost (izgled za predstavitev podjetja/produkta) se naredi kasneje, po tem ko so glavne funkcionalnosti aplikacije narejene.