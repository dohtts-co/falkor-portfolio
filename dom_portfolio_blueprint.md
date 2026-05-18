# DOM (FALKOR_AE) — PORTFOLIO WEBSITE BLUEPRINT
### Modelled on Calvin Pausania | calvinpausania.com

---

## OVERVIEW

This document is a direct translation of the Calvin Pausania website structure into a buildable blueprint for Dom's photography portfolio. Every design decision references what was observed on the live Calvin Pausania site and maps it explicitly to Dom's body of work, his 100 day Tokyo project, his shooting style, and his imagery.

---

## 1. SITE ARCHITECTURE

### Calvin's Structure (Observed)
- Homepage: Full screen image, name centred, single word CTA ("ENTER")
- Portfolio: Project based grid linking to individual project pages
- About: Short declarative statement, one philosophical quote, alphabetical client list
- Contact: Minimal form, single email address

### Dom's Equivalent Structure

```
Homepage        →  Full screen Tokyo image + "ENTER"
Portfolio       →  Tokyo Chapters (organised by neighbourhood)
About           →  One sentence, one line of context, Instagram + email
Contact         →  Single form field + falkor_ae@[email]
```

**Pages: 4 total. Nothing more.**

The discipline here is intentional. Calvin's site proves that four pages at this level reads as confidence, not laziness. Every additional page Dom adds dilutes the impact of the work.

---

## 2. HOMEPAGE — THE ENTRY SCREEN

### What Calvin Does
The homepage loads a single full screen photograph. His name appears in uppercase centred on the image. Below it, one line of descriptor text. Below that, a single word in uppercase: **ENTER**. There is no scroll. No navigation visible until you enter. The image is the entire first experience.

### What Dom Replicates

**Hero Image:** The Shinjuku portrait (image 9 in the archive — man in black denim jacket, colourful Shinjuku skyline behind him) is the strongest candidate for the entry image. It has the visual impact to hold a full viewport without shrinking. The subject faces directly into camera. The background is graphically rich. It immediately signals Tokyo, portraiture, and confidence.

**Alternative Hero:** The らんまん食堂 restaurant worker at night (image 40) works if Dom wants to lead with atmosphere over portraiture. It signals the environmental, humanist quality of his work rather than the portrait series specifically.

**Text Overlay (Exact Replication of Calvin's Format):**

```
DOM ARKEZAQ
PHOTOGRAPHER

DOCUMENTING THE QUIET LIVES OF TOKYO, ONE FACE AT A TIME.

ENTER
```

All text sits centred on the image. Name at top. Descriptor line below. Tagline below that. ENTER at the bottom. Everything in uppercase. Font: thin weight geometric sans (Helvetica Neue UltraLight, Futura Light, or Inter Thin). Letter spacing set wide (0.3em minimum). Text colour: pure white (#FFFFFF). No text shadow. No background pill or box behind the text — the image must breathe around it.

**Background Colour:** Pure black (#000000). The image sits inside the viewport with no border. Black bleeds to the edges of the screen.

---

## 3. NAVIGATION

### What Calvin Does
Navigation appears only after clicking ENTER. It sits at the top of the page in uppercase, spaced horizontally: **CALVIN PAUSANIA — PORTFOLIO — ABOUT — CONTACT**. The name functions as the home button. Navigation does not animate or hover with colour. It is white text on black or overlaid on imagery at low opacity.

### What Dom Replicates

```
FALKOR  ·  PORTFOLIO  ·  ABOUT  ·  CONTACT
```

The alias FALKOR functions as the home link, mirroring how Calvin uses his name. The dot separator (·) is a detail lifted from Calvin's site that adds visual rhythm without extra weight. Navigation is fixed at the top of every internal page. On mobile it collapses to a hamburger icon in the top right corner.

**Typography rules for navigation:**
- Font: Same geometric sans as homepage
- Size: 11px to 13px
- Letter spacing: 0.25em
- Weight: Regular (not bold)
- Colour: White on black backgrounds, black on light image areas (auto invert via blend mode)

---

## 4. PORTFOLIO PAGE — TOKYO CHAPTERS

### What Calvin Does
Calvin organises work into named projects (e.g. Revalux). Each project appears as a full width image tile on the portfolio page with the project name overlaid. Clicking a tile opens a dedicated project page with a sequence of images from that shoot.

### What Dom Replicates (Adapted for His Content Architecture)

Instead of client projects, Dom's organising unit is **neighbourhood**. Each Tokyo neighbourhood he has shot becomes a chapter. This maps exactly onto the 100 day project structure and gives future work a natural home as the project grows.

**Chapter Tiles on Portfolio Page:**

Each chapter is represented by a single full width image tile, cropped to landscape 16:9. The neighbourhood name overlays in uppercase at the bottom left of the tile, small and quiet. On hover the image darkens slightly (10% black overlay) and the name brightens.

```
SHINJUKU        →  Lead image: smoking man portrait (image 55 or Day 1 hero)
AKIHABARA       →  Lead image: 東京 tshirt portrait (image 11)
EBISU           →  Lead image: New York neon sign (Day 2 Instagram post)
HARAJUKU        →  Lead image: Penny Lane neon (image 61)
STREETS         →  Lead image: らんまん食堂 restaurant worker (image 40)
```

The final chapter "STREETS" acts as a catch-all for images that belong to the project but do not anchor to one neighbourhood — the mechanic (image 3), the skateboarder (image 7), the corridor (image 30).

**Inside Each Chapter:**

When a chapter is opened, images are presented one at a time, full viewport height, centred on black. The viewer scrolls or uses arrow keys to move between images. No thumbnails. No grid. One image fills the screen at a time. Below each image, a location tag in small uppercase: SHINJUKU, 2026. Nothing else.

This is the direct application of Calvin's single image dominance principle to Dom's portrait orientation images. Because Dom shoots primarily vertical, centering one image on a black background with generous black on either side creates a gallery wall effect rather than a stretched or cropped image problem.

---

## 5. ABOUT PAGE

### What Calvin Does
Calvin's about page opens with his name in large uppercase. Then a short biography in uppercase body text. Then a philosophical line set apart: **"TO LEAD AN ORCHESTRA YOU MUST TURN YOUR BACK ON THE CROWD."** Then an alphabetical client list in uppercase, no logos, no links, just names.

### What Dom Replicates

Dom does not have a client list yet. This is not a problem — it is an opportunity to write the page with the same authority Calvin's page has, but through a different kind of credibility: specificity of place and project.

**About Page Copy (Exact Text to Use):**

```
DOM ARKEZAQ

PHOTOGRAPHER BASED IN YOKOHAMA, JAPAN.

DOCUMENTING THE QUIET LIVES OF TOKYO, ONE FACE AT A TIME.

CURRENTLY: 100 DAYS. DAY [N]/100.

CANON EOS M100.

INSTAGRAM: @FALKOR_AE
CONTACT: [EMAIL]
```

The "CURRENTLY: 100 DAYS. DAY [N]/100." line is updated as the project progresses. This gives the page a living quality and signals active practice without requiring a blog or journal. It functions the same way Calvin's client list does — as proof of ongoing, serious work.

No profile photograph of Dom. No long biographical paragraph. No social media icons. Text only. Uppercase throughout. Left aligned on desktop, centred on mobile.

---

## 6. CONTACT PAGE

### What Calvin Does
A single line of instruction in uppercase. A minimal form below it. An email address below that. Nothing else. The page background is black. The form fields are borderless or have a single thin white underline border only. The submit button is text only in uppercase — no background, no border, just the word SUBMIT.

### What Dom Replicates

```
FOR WORK ENQUIRIES AND COLLABORATIONS
PLEASE FILL OUT THE FORM BELOW

[NAME FIELD]
[EMAIL FIELD]
[MESSAGE FIELD]

SUBMIT

OR EMAIL DIRECTLY: [EMAIL ADDRESS]
```

Form field styling: single bottom border line only (1px white at 40% opacity). No background fill. Placeholder text in uppercase at 30% white opacity. On focus, border brightens to 100% white. Submit button: uppercase text, no background, thin white border that appears only on hover.

---

## 7. TYPOGRAPHY SYSTEM

### Observed on Calvin's Site
All caps throughout. One typeface only. Thin to regular weight range. Wide letter spacing. No bold text anywhere on the site. Type is infrastructure — it organises but never competes with imagery.

### Dom's Typography Specification

**Primary Font:** Inter (free, Google Fonts) or Helvetica Neue if licensed.

| Element | Size | Weight | Letter Spacing | Case |
|---|---|---|---|---|
| Site Name (Nav) | 13px | 300 Light | 0.25em | UPPER |
| Nav Links | 11px | 300 Light | 0.25em | UPPER |
| Chapter Names (Portfolio) | 14px | 300 Light | 0.3em | UPPER |
| Location Tags (Image) | 10px | 300 Light | 0.2em | UPPER |
| About Body Text | 13px | 300 Light | 0.15em | UPPER |
| Tagline (Homepage) | 15px | 200 Thin | 0.35em | UPPER |
| Form Labels | 11px | 300 Light | 0.2em | UPPER |

**No bold. No italic. No serif. Ever.**

---

## 8. COLOUR SYSTEM

### Observed on Calvin's Site
Pure black backgrounds throughout. White text. No accent colours. Imagery provides all colour. The interface is achromatic so that the photographs, whether warm tonality, neon electric, or monochrome, always read correctly against it.

### Dom's Colour Specification

| Element | Value |
|---|---|
| Background (all pages) | #000000 |
| Primary Text | #FFFFFF |
| Secondary Text (tags, labels) | #FFFFFF at 50% opacity |
| Form Field Border (idle) | #FFFFFF at 30% opacity |
| Form Field Border (active) | #FFFFFF at 100% |
| Hover Overlay on Chapter Tiles | #000000 at 15% opacity |
| Navigation Active State | #FFFFFF at 100% |
| Navigation Idle State | #FFFFFF at 60% |

**No grey backgrounds. No cards. No shadows. No gradients.**

---

## 9. IMAGE PRESENTATION RULES

These rules protect Dom's work from the bottlenecks identified in the portfolio archive analysis.

**Rule 1: One image per viewport inside chapters.**
Never show two of Dom's images side by side. His portrait orientation images need the full height of the screen. Gridding them reduces them to thumbnails of themselves.

**Rule 2: Maximum 8 images per chapter.**
This enforces the curation discipline identified as a bottleneck. 8 strong images per chapter is a portfolio. 20 images per chapter including near duplicates is an archive. The website shows the portfolio.

**Rule 3: No near duplicates.**
The Akihabara session (images 10, 11, 12 — all variants of the same pose) should contribute only one image to the Akihabara chapter. Choose the strongest frame, remove the rest from the site entirely.

**Rule 4: Monochrome and colour do not mix within a chapter.**
The Shinjuku chapter can be monochrome (images 55, 45, and the Day 1 portrait) or colour, but not both. Calvin's site maintains strict tonal consistency within projects. Dom should apply the same principle per chapter.

**Rule 5: The GiGO duck image (phone quality, landscape) does not appear on the site.**
It was identified as phone quality and sits outside the visual standard of the camera work. It belongs on Instagram stories, not a portfolio.

**Rule 6: Portrait images are centred on black, never stretched to fill a landscape viewport.**
The black on either side is not empty space. It is a gallery wall. It is the correct presentation for Dom's shooting format.

---

## 10. MOBILE BEHAVIOUR

Calvin's site collapses to a single column with the same design language intact. On mobile:

**Homepage:** Full screen image, name centred, ENTER button. Identical to desktop. The portrait orientation of Dom's images actually fills a mobile screen more naturally than a landscape desktop viewport — this is an advantage.

**Navigation:** Hamburger icon top right. Opens as a full screen black overlay with the four nav links centred vertically. Large uppercase text, wide letter spacing. Tapping anywhere outside the links closes the overlay.

**Chapters:** Single image per screen. Swipe left/right to navigate. Location tag at bottom. Chapter name at top. No thumbnails.

**About:** Single column, centred text, same uppercase system.

---

## 11. BUILD PLATFORM RECOMMENDATION

**Wix** is the platform Dom should use, specifically because Calvin Pausania built his site on Wix and achieved this level of quality within it. The platform can execute everything in this blueprint without custom code.

Within Wix, the approach is:

Use a **blank template** not a photography template. Photography templates come pre-loaded with grid systems and hover effects that contradict everything in this blueprint. Start from nothing and build upward.

Use **Wix's full width strip sections** for all image containers. Set strip height to 100vh (full viewport height) for chapter pages and the homepage.

Use **Wix's Lightbox feature** for the ENTER button transition — it creates the gated entry experience Calvin uses.

Use **Wix's Repeater component** for the chapter tile grid on the portfolio page, with custom hover states applied via the Wix design panel.

**Domain:** dom should register falkor.photography or falkorphotography.com — short, memorable, and signals professional intent immediately.

---

## 12. LAUNCH CHECKLIST

Before the site goes live, every item below must be confirmed:

- [ ] Maximum 8 images selected per chapter, no near duplicates
- [ ] All monochrome chapters contain only monochrome images
- [ ] GiGO duck image removed from all pages
- [ ] All text on site is uppercase, thin weight, wide letter spacing
- [ ] Background is pure black #000000 on every page
- [ ] Homepage hero image fills 100% of the viewport with no white border
- [ ] ENTER button is present and gates the portfolio
- [ ] Navigation contains exactly 4 items: FALKOR / PORTFOLIO / ABOUT / CONTACT
- [ ] About page contains the 100 days counter updated to current day number
- [ ] Contact form has been tested and delivers to Dom's email
- [ ] Site has been viewed on mobile and images render at full height
- [ ] Domain is connected and custom (not the default Wix subdomain)
- [ ] No Adobe Portfolio link or branding remains anywhere

---

*Blueprint prepared May 2026. Based on live analysis of calvinpausania.com and full review of Dom's 62 image project archive.*
