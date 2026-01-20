# KMSŽU Defenses Assistant (Electron)

Desktopová Electron aplikace pro předsedajícího/vedoucího komise, která pomáhá **řídit průběh obhajob** (Bc/Mgr), **hlídat čas** po fázích, dělat **poznámky**, vyhodnocovat průběžně přes **kritéria + progressbar** a na konci **exportovat** záznamy.

> Primární use‑case: obhajoby na Katedře mediálních studií a žurnalistiky (FSS MU), ale logika je obecně použitelná i jinde.

---

## Funkce

### Práce se dnem obhajob
- **Nový den obhajob** (Bc nebo Mgr).
- **Import rozpisu komise** (vložením textu „vstup pro komisi“ z IS) → automaticky vytvoří kartičky studujících.
- **Uložení / otevření** dne do/ze souboru (JSON).

### Fáze a časomíry (per student)
Každý student má samostatné stopky pro fáze:
- Přivítání
- Prezentace
- Čtení posudků
- Diskuze
- Porada komise
- Přestávka

Vždy může běžet jen **jedna** fáze (start nové fáze stopne ostatní). Zároveň se počítá **celkový čas**.

Limity (výchozí):
- **Bc:** 40 min celkem, 15 min prezentace, 5 min přestávka
- **Mgr:** 60 min celkem, 15 min prezentace, 5 min přestávka

Aplikace vizuálně zvýrazňuje stav:
- **OK** (v limitu),
- **běží**,
- **OVER** (přetahuje).

### Kartička studujícího
- Jméno, UČO
- Vedoucí, oponent/ka (editovatelné)
- Plánovaný start/konec
- Skutečný start/konec (odvozuje se z průběhu; uzavírá se při známce / přechodu na dalšího)
- Poznámky předsedajícího
- Hodnocení: **prospěl/a výborně**, **prospěl/a**, **neprospěl/a**, **nedostavil/a se**
  - Po výběru známky se zobrazí i vysvětlující text (definice).

### Kritéria + progressbar + doporučení známky
- 10 checkboxů (kritéria) + progressbar (1–10).
- 1. kritérium je **„Formální náležitosti (povinné části + rozsah)”** a funguje jako **gate**:
  - pokud není splněno, doporučení je **automaticky neprospěl/a** (bez ohledu na ostatní kritéria).
- U formálních náležitostí je **infobox** (povinné části + rozsah, co se počítá/nepočítá).

### Oběd / bloky dne a dvojí vyhlášení
Pokud rozpis obsahuje pauzu (typicky oběd), pozná se to tak, že obhajoby **plánovaně nenavazují** (mezera mezi `plannedEnd` a dalším `plannedStart`).

- Seznam studujících se barevně rozdělí do bloků.
- V topbaru se zobrazí:
  - **Vyhlášení před obědem**
  - **Vyhlášení po obědě**
- Druhý blok se počítá znovu, jako by první obhajoba po obědě byla „první obhajobou dne“.

### Predikce „Vyhlášení“
Predikce se průběžně přepočítává:
- pro dokončené obhajobyýmy bere **reálný čas** (skutečný start/konec nebo odjeté stopky),
- pro nedokončené bere **předpokládaný čas** (40/60 min) a zohledňuje i přetahování.

### Export
- Export do **CSV**
- Export do **TXT**

---

## Ovládání (rychlý workflow)

1. **Import rozpisu**
   - Klikni `Import rozpisu`
   - Vlož text z IS („vstup pro komisi“)
   - Klikni `Importovat`

2. **Během obhajoby**
   - Vyber studenta v seznamu
   - Klikáním na fáze spouštěj/stopuj stopky
   - Piš poznámky
   - Zaškrtávej kritéria (progressbar se aktualizuje)

3. **Ukončení studenta**
   - Zadej hodnocení (známku)
   - Přepni na dalšího studenta

4. **Ulož a exportuj**
   - `Uložit` / `Uložit jako` (JSON)
   - `Export CSV` / `Export TXT`

---

## Spuštění (vývojově / lokálně)

### Požadavky
- **Node.js (LTS)** + npm

Ověření:
```bash
node -v
npm -v
```

### Instalace závislostí
V kořeni projektu:
```bash
npm install
```

### Spuštění aplikace
```bash
npm run dev
```

> Projekt používá Electron jako jedinou runtime závislost a skript `dev` je definovaný v `package.json`.

---

## Struktura projektu

Typicky:
- `main.js` – Electron main process (okno, dialogy pro open/save/export)
- `preload.js` – bezpečné API `window.kmszu.*` pro renderer
- `renderer/` – UI (HTML/CSS/JS)
  - `index.html`
  - `styles.css`
  - `app.js`
- `shared/` – model, parser, export, time helpery
  - `model.js`, `parser.js`, `export.js`, `time.js`

---

## Nastavení (v JSONu dne)

V objektu `day.settings` lze měnit např.:
- `limits.totalMin` (40/60)
- `limits.phasesMin.{welcome,presentation,reports,discussion,deliberation,break}`
- `breakDetectMin` (detekce oběda/pauzy; default 30 minut)
- prahy pro doporučení známky (např. `colorThresholds.failMax/passMax/excellentMax`)

---

## Tipy pro debug
- DevTools:
  - macOS: `Cmd + Option + I`
  - Windows/Linux: `Ctrl + Shift + I`
- Pokud se UI nechová správně během běžících stopek, zkontroluj, že se **nepřerenderuje celá karta** (pouze „živé“ elementy: časy, badge, třídy tlačítek).

---

## Roadmap / možné rozšíření
- build balíčků (DMG/MSI) přes electron-builder
- nastavitelný počet bloků dne (nejen oběd)
- import více komisí do jednoho dne
- export ve formátu pro administrativní protokol

---

## License
Doplňte dle potřeby (např. MIT).

---

## Prompt template (pro další úpravy)

Zkopíruj a použij jako startovní prompt:

> Jsi programovací asistent. Pracuji na Electron/JS desktop aplikaci „KMSŽU Defenses Assistant“.  
> Aplikace má topbar (čas, pořadí, aktuální/následující student, fáze, vyhlášení), sidebar se seznamem studentů a hlavní kartu studenta.  
> Každý student má stopky pro fáze: welcome, presentation, reports, discussion, deliberation, break. Vždy smí běžet jen jedna fáze. Aplikace hlídá limity (Bc 40 min celkem, Mgr 60 min celkem, presentation 15 min, break 5 min) a vizuálně indikuje OK/OVER.  
> Import rozpisu probíhá vložením textu „vstup pro komisi“ z IS, parser vytvoří day + students.  
> Aplikace umí export CSV a TXT.  
> Existuje logika oběda: pokud je v plánu mezera mezi plannedEnd a dalším plannedStart >= breakDetectMin (default 30 min), rozdělí se den do bloků a topbar ukáže vyhlášení pro každý blok; po obědě se počítá jako nový start bloku.  
> Kritéria: 10 checkboxů + progressbar. Checkbox 1 je „Formální náležitosti (povinné části + rozsah)“ a je gate: když není splněno, doporučení známky je automaticky neprospěl/a.  
> Dbej na to, aby při běžících stopkách nebyl re-render celé karty (jen aktualizace živých prvků), aby šly editovat inputy/checkboxy.  
>  
> Chci úpravu: **[SEM NAPIŠ POŽADAVEK]**.  
> Vrať konkrétní patch (konkrétní soubory/funkce), bez obecné teorie.
