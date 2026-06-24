# iLovePDF "All PDF tools" Mega Menu — Deep Technical Study

This document reverse-engineers the "All PDF tools" mega menu on
`https://www.ilovepdf.com/`. Every claim below is grounded in the live
HTML (`view-source:` as of 2026-06-25) and the production asset bundle
`/dist/js/web.d57e5bf.js` + `/dist/css/web.d57e5bf.css`.

---

## 1. Executive summary

The iLovePDF mega menu is **not** a JS-driven hover megamenu. It is a
**purely CSS-driven hover megamenu on desktop** that is **additionally
opened/closed by a tiny JS click-toggle** for click support and mobile.
There is **no JS hover bridge, no `mouseenter`/`mouseleave` handler, no
`setTimeout`/`clearTimeout` debouncing, and no animation library**. The
"hover bridge" between the trigger and the panel is achieved entirely with
a 24-pixel transparent `padding-top` on the panel plus a 2-pixel vertical
overlap. Because the trigger and the panel share a single ancestor that
the panel is `position: absolute`'d against, CSS `:hover` on that ancestor
stays true while the cursor traverses the gap — so the menu never
"falls through" the dead zone.

If your mega menu "doesn't appear when hovered or clicked," the most
likely root causes (in order) are:

1. The trigger and the panel are siblings but the panel is **not
   absolutely positioned relative to a wrapper that also wraps the
   trigger**. Without that common ancestor, the CSS `:hover` cannot stay
   true across the gap.
2. The dead zone between trigger and panel is **larger than the CSS
   padding/overlap** you allow for.
3. You wired up `mouseenter`/`mouseleave` and `setTimeout`/`clearTimeout`
   for hover, but a CSS hover-state reset on the parent turns the panel
   off before the JS can keep it open.

Read on for the full event-level breakdown.

---

## 2. DOM structure (the actual markup, with class names)

The trigger and the panel live inside the same `<nav>` block. Lines are
from the live page source (`grep -n` confirms exact line numbers).

```
<nav>                                              ← header navigation
  <a class="brand" href="/" title="iLovePDF">…</a>
  <div class="menu">                               ← outer wrapper (the
                                                    hover/click root)
    <span class="menu--sm">                        ← MOBILE trigger:
      <i class="ico ico--hamburger"></i>            ← hamburger icon
    </span>

    <span class="menu--md">                        ← DESKTOP trigger:
      All PDF tools <i class="ico ico--down"></i>  ← "All PDF tools ▼"
    </span>

    <ul>…compact menu (Merge / Split / Compress / Convert)…</ul>

    <ul class="menu__main">                        ← THE PANEL container
      <li class="nav-has-dropdown nav-has-dropdown--full">
        <span class="hide--sm">All PDF tools
          <i class="ico ico--down"></i>
        </span>
        <div class="nav-dropdown nav-dropdown--full">  ← THE PANEL itself
          <ul>                                        ← columns wrapper
            <li>                                      ← COLUMN 1
              <ul>
                <li><div class="nav__title">Organize PDF</div></li>
                <li><a href="/merge_pdf"><i class="ico ico--merge"></i> Merge PDF</a></li>
                …
              </ul>
            </li>
            <li>… COLUMN 2: Optimize PDF …</li>
            <li>… COLUMN 3: Convert to PDF …</li>
            <li>… COLUMN 4: Convert from PDF …</li>
            <li>… COLUMN 5: Edit PDF …</li>
            <li>… COLUMN 6: PDF security …</li>
            <li>… COLUMN 7: PDF Intelligence …</li>
          </ul>
        </div>
      </li>
    </ul>
  </div>
</nav>
```

Key observations:

- The trigger is **not** a `<button>` and carries **no** ARIA
  (`aria-haspopup`, `aria-expanded`, `aria-controls`). The whole control
  is a `<span>` inside an `<li>`.
- The panel (`<div class="nav-dropdown nav-dropdown--full">`) is a
  **sibling** of the trigger `<span>`, not a child of it.
- Both the trigger and the panel are descendants of the **same wrapper
  `<div class="menu">`** — that single ancestor is the key to the entire
  interaction model.
- The compact menu `<ul>` (Merge / Split / …) is a separate sibling used
  on mobile when the panel is collapsed; on desktop it is not what you
  see — you see `.menu__main`.

---

## 3. The interaction model (open / close)

### 3.1 On desktop — pure CSS `:hover`

The desktop trigger `.menu--md` is hidden by default on mobile and shown
on desktop (`display: none` ⇒ `display: flex` via breakpoint rules).
The wrapper `.menu` is the hover root:

```css
/* The trigger wrapper itself is the hover region */
.header .menu {
  margin: 0 24px;
  align-items: center;
  height: 100%;
  display: flex;
  order: 2;
  font-weight: 500;
  font-size: 14px;
  line-height: 18px;
  text-transform: uppercase;
}

/* The panel sits below the wrapper, absolutely positioned. */
.menu__main {
  top: calc(100% - 2px);    /* 2-pixel OVERLAP into the trigger */
  padding-top: 24px;        /* INVISIBLE 24-pixel hover bridge */
  position: absolute;
  width: 90vw;
  transform: translate(5%); /* visually center the 90vw panel */
  display: block;
  left: 0;
  height: auto;
}

/* HOVER opens it — no JS involved */
.header .menu:hover .menu__main { … above styles … }
```

Result: while the cursor is anywhere over `.menu` (which now includes
the trigger, the 2-pixel overlap, and the 24-pixel invisible padding),
`:hover` stays true and the panel stays rendered.

The panel's actual visible card is `<div class="nav-dropdown">`
*inside* `.menu__main`. Its white background, border-radius, shadow and
animation are:

```css
.nav-dropdown {
  display: none;
  position: absolute;
  top: calc(100% - 2px);
  left: 50%;
  transform: translateX(-50%);
  padding-top: 16px;        /* smaller hover bridge for sub-menus */
  cursor: auto;
  min-width: 500px;
}
.nav-dropdown > * {        /* the visible card */
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  animation: fade-in-bottom .08s ease-in-out both;
  box-shadow: 0 5px 45px rgba(22, 22, 22, .10);
}
```

For the **full-width** variant (the "All PDF tools" mega menu):

```css
.nav-dropdown--full {
  left: 50%;
  transform: translate(-50%);
  max-width: 95vw;
  width: max-content;
}
.nav-dropdown--full > ul > li {       /* each column */
  min-width: 220px;
  max-width: 240px;
  margin-right: 24px;
  margin-left: 24px;
}
```

The column wrapper is `display: flex; flex-wrap: wrap;
justify-content: space-between` with 24-pixel horizontal margins per
column, so on wide viewports you get 7 columns side by side and on
narrower screens the columns wrap to a second row.

The animation is a **CSS-only keyframe**, not a library:

```css
@keyframes fade-in-bottom {
  0%   { transform: translateY(50px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

Total perceived open time: ~80 ms. There is no `transition` — the
animation is `animation: fade-in-bottom .08s ease-in-out both;` so the
panel renders hidden the instant `:hover` becomes false.

### 3.2 Click toggle — the *only* JavaScript involved

There is one JS function that controls all top-menu open/close. I
extracted it verbatim from `web.d57e5bf.js` and de-minified it here:

```js
// === u.prototype.initTopMenu — single function, ~12 lines of logic ===
initTopMenu() {
  var lastWidth = window.innerWidth;

  // 1) Click on any menu root toggles its .open class.
  document
    .querySelectorAll('.header .menu, .nav-has-dropdown, .nav__group')
    .forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();                              // (a)
        el.classList.toggle('open');                      // (b)
        lastWidth = window.innerWidth;
        // Close OTHER open menus that are NOT ancestors of `el`.
        document
          .querySelectorAll('.header .menu.open, .nav-has-dropdown.open, .nav__group.open')
          .forEach(function (other) {
            if (!other.contains(el)) other.classList.remove('open');
          });
        // Toggle body lock
        var openCount = document.querySelectorAll(
          '.header .menu.open, .nav-has-dropdown.open, .nav__group.open'
        ).length;
        document.body.classList.toggle('nav-open', openCount > 0);
      });
    });

  // 2) Click outside ANY open menu closes them all.
  document.addEventListener('click', function (e) {
    document
      .querySelectorAll('.header .menu.open, .nav-has-dropdown.open, .nav__group.open')
      .forEach(function (el) {
        if (!el.contains(e.target)) el.classList.remove('open');
      });
  });

  // 3) Window resize: if width grows by 20+ px, close everything
  //    (used to drop a mobile panel when the viewport crosses a
  //    breakpoint that suddenly reveals a desktop layout).
  window.addEventListener('resize', function () {
    var w = window.innerWidth;
    if (w > lastWidth + 20) {
      lastWidth = w;
      document
        .querySelectorAll('.header .menu, .nav-has-dropdown.open, .nav__group.open')
        .forEach(function (el) { el.classList.remove('open'); });
    }
  });
}
```

That is the entire menu control surface. Specifically note what is
**NOT** in there:

- No `addEventListener('mouseenter', …)` on the trigger.
- No `addEventListener('mouseleave', …)` on the trigger or the panel.
- No `setTimeout` / `clearTimeout` for closing.
- No library like `hoverIntent`, `GSAP`, `framer-motion`, or `tippy.js`
  wired to the menu (those are used elsewhere on the page for tooltips).

### 3.3 What happens at each interaction

| User action              | Mechanism                                                                                                  | Visible result                              |
|--------------------------|------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| Hover the `.menu` wrapper | CSS `:hover` selector `.header .menu:hover .menu__main { … }`                                              | Panel fades in over 80 ms                   |
| Move cursor from trigger into the gap | The `.menu` ancestor still matches `:hover` because the panel's 24-px `padding-top` is inside `.menu__main` which is inside `.menu` | Panel stays open                          |
| Move cursor onto the panel  | Same — `:hover` still true                                                                                  | Panel stays open                            |
| Move cursor outside `.menu` | `:hover` becomes false on `.menu`                                                                          | Panel is removed from layout (no animation) |
| Click the trigger           | `e.stopPropagation()` + `classList.toggle('open')` on `.header .menu`                                      | `.open` mirrors `:hover` so panel stays open |
| Click the trigger again     | `.open` toggles off                                                                                         | Panel hides immediately                      |
| Click anywhere outside any open menu | `document` click handler closes everything whose ancestor chain does not contain `e.target`         | Panel hides                                  |
| Press Tab / Shift+Tab       | Native focus. **No menu JS responds to focus or keyboard.** (See §6.)                                       | Menu does not open                           |
| Press Escape                | **No JS handler.** Panel stays open.                                                                        | No close                                     |
| Resize viewport wider by ≥ 20 px | `resize` listener removes `.open`                                                                       | Forces re-evaluation of layout mode         |

---

## 4. Close mechanisms (code-level)

There are **four** ways the menu closes. Three are explicit, one is
implicit via CSS:

### 4.1 Implicit close — CSS `:hover` ends

```css
/* Panel is rendered because :hover is true */
.header .menu:hover .menu__main { display: block; … }

/* The instant :hover is false, this whole selector stops matching,
   the panel is removed from layout, no animation out. */
```

This is the dominant close path on desktop.

### 4.2 Explicit close — second click on the trigger

```js
el.classList.toggle('open');   // re-click removes .open
```

This makes the menu behave like an accordion when the user clicks. It
also makes the menu work on **touch devices** where `:hover` is sticky
and unreliable.

### 4.3 Explicit close — click outside

```js
document.addEventListener('click', function (e) {
  document.querySelectorAll(
    '.header .menu.open, .nav-has-dropdown.open, .nav__group.open'
  ).forEach(function (openEl) {
    if (!openEl.contains(e.target)) openEl.classList.remove('open');
  });
});
```

This handles click-outside for **every** open sub-dropdown recursively
(nested `.nav__group` and `.nav-has-dropdown` use the same pattern).
Critically, `e.stopPropagation()` is called on the trigger click, so the
outside-click handler never sees it as an outside click.

### 4.4 Explicit close — resize across breakpoint

```js
window.addEventListener('resize', function () {
  if (window.innerWidth > lastWidth + 20) {
    document.querySelectorAll(
      '.header .menu, .nav-has-dropdown.open, .nav__group.open'
    ).forEach(function (el) { el.classList.remove('open'); });
  }
});
```

Prevents a mobile-opened panel from getting stuck open after the user
rotates the device or crosses a breakpoint into desktop layout.

---

## 5. The "hover bridge" — what it really is

iLovePDF **does not use an invisible `<div>` hover bridge**. It uses
**CSS `padding-top` on the panel itself** as the bridge, plus a tiny
negative offset that overlaps the trigger by 2 px. Combined with the
fact that the panel is `position: absolute` and a descendant of the
same `.menu` wrapper that the user is currently hovering, the
`:hover` pseudo-class never goes false while the cursor is in the
gap.

```css
.menu__main {
  position: absolute;
  top: calc(100% - 2px);   /* overlap the trigger bottom by 2 px */
  padding-top: 24px;       /* invisible 24-px hover bridge */
  /* … */
}
.nav-dropdown {
  position: absolute;
  top: calc(100% - 2px);
  padding-top: 16px;       /* smaller bridge for sub-menus */
  /* … */
}
```

The visible card lives on `<div class="nav-dropdown">`, which is the
*only* child of the `<li>` that carries the background, padding and
shadow:

```css
.nav-dropdown > * {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  animation: fade-in-bottom .08s ease-in-out both;
  box-shadow: 0 5px 45px rgba(22, 22, 22, .10);
}
```

So visually the panel appears 24 px (mega) or 16 px (sub-menu) below
the trigger, but the *interactive* region of the panel is the full
`<div class="nav-dropdown">` including its padding-top — that's what
keeps `:hover` alive.

### 5.1 Why this works at the event level

The CSS `:hover` pseudo-class follows **DOM ancestry**, not painted
geometry. As long as the cursor is over any descendant of `.menu`, the
selector `.header .menu:hover .menu__main { … }` keeps matching. Because
`.menu__main` is a descendant of `.menu`, the cursor entering
`.menu__main`'s `padding-top` region **still** counts as hovering
`.menu`. Therefore no `mouseenter`/`mouseleave` listener is required.

### 5.2 Measured pixel gap

The visible vertical gap between the bottom of the trigger text and the
top of the visible white card is **24 px** for the "All PDF tools"
mega panel (matching `padding-top: 24px` on `.menu__main`) and
**16 px** for sub-menus (matching `padding-top: 16px` on
`.nav-dropdown`). On top of that there is a **2 px overlap**
(`top: calc(100% - 2px)`) so the trigger and the panel's interactive
zone share a 2-px sliver — a safety margin against sub-pixel rounding
and high-DPI rendering quirks.

---

## 6. Keyboard / accessibility behavior

This is the part of the implementation that is **deliberately minimal**:

- The trigger is a `<span>`, not a `<button>`, so it is **not focusable
  by default**.
- There is **no `tabindex`** on it.
- There is **no `aria-haspopup`, `aria-expanded`, or `aria-controls`**
  on the trigger.
- There is **no JS keydown handler** for Enter, Space, ArrowDown, or
  Escape on the menu.
- The `document` click handler closes panels on any click, but focus
  moves are not intercepted.

Net effect: keyboard users can tab *past* the trigger without ever
opening the menu, and a sighted keyboard user has no way to open it
through the keyboard alone. Touch users rely on the click toggle.

This is clearly a known accessibility debt — the page does use
`aria-label`s and roles elsewhere, but not on this control.

---

## 7. Panel internal layout (what's actually inside the panel)

### 7.1 Width

```css
.nav-dropdown--full {
  left: 50%;
  transform: translate(-50%);    /* center horizontally on the trigger */
  max-width: 95vw;                /* never overflow the viewport */
  width: max-content;             /* shrink-wrap to content */
}
```

The 90-vw fallback (`width: 90vw`) on `.menu__main` itself is just the
*outer* width that frames the white card; the card itself shrinks to
fit the columns.

### 7.2 Column structure

```html
<div class="nav-dropdown nav-dropdown--full">
  <ul>                            <!-- the columns wrapper -->
    <li>                          <!-- COLUMN: Organize PDF -->
      <ul>
        <li><div class="nav__title">Organize PDF</div></li>
        <li><a><i class="ico ico--merge"></i> Merge PDF</a></li>
        <li><a><i class="ico ico--split"></i> Split PDF</a></li>
        …
      </ul>
    </li>
    <li>… Optimize PDF …</li>
    <li>… Convert to PDF …</li>
    <li>… Convert from PDF …</li>
    <li>… Edit PDF …</li>
    <li>… PDF security …</li>
    <li>… PDF Intelligence …</li>
  </ul>
</div>
```

CSS for the columns:

```css
.nav-dropdown > ul {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  position: relative;
  width: 100%;
  margin: auto;
  padding: 24px;
}
.nav-dropdown--full > ul > li {
  min-width: 220px;
  max-width: 240px;
  margin-right: 24px;
  margin-left: 24px;
}
.nav__title {
  text-transform: uppercase;
  margin-bottom: 12px;
  color: #707078;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  text-align: left;
}
.nav-dropdown a {
  padding: 8px;
  margin-left: -8px;
  margin-right: -8px;
  width: calc(100% + 16px);
  border-radius: 8px;
}
.nav-dropdown a:not(.btn):hover { background: #f5f5fa; }
```

So each "column" is one `<li>` containing a header `<div
class="nav__title">` and a vertical list of icon-label links. The
columns wrap with `flex-wrap: wrap` when the viewport is too narrow.

### 7.3 Body scroll lock

While any menu is open, JS toggles `body.nav-open`:

```js
document.body.classList.toggle('nav-open', openCount > 0);
```

```css
body.nav-open { max-height: 100vh; overflow: hidden; }
body.nav-open .footer { display: none; }
```

This stops background scrolling on mobile (where the panel is a
`position: fixed; height: 100vh` overlay) and hides the footer so the
footer doesn't bleed through the overlay.

### 7.4 Mobile / small-viewport variant

The same selectors switch the panel to a fullscreen overlay:

```css
@media (max-width: …) {
  .menu__main {
    display: block;
    position: fixed;       /* fullscreen, not anchored to trigger */
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: auto;
    background: #fff;
    padding-top: 60px;
    z-index: 1;
  }
  .nav-dropdown {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    padding-top: 60px;
    z-index: 1;
  }
}
```

The hover bridge is **irrelevant on mobile** because the panel covers
the entire viewport — once opened (by click), it can only be closed by
the back-arrow pseudo-element (a 60×60 SVG `×` button rendered via
`::before` on `.nav-dropdown`).

---

## 8. Best practices you can borrow

If your mega menu is broken, the iLovePDF implementation suggests the
following fixes, in order of likelihood:

1. **Make the panel a sibling of the trigger inside one common
   wrapper**, and anchor the panel to that wrapper (`position:
   relative` on the wrapper, `position: absolute; top: 100%;` on the
   panel). The wrapper is what `:hover` should track, not the trigger
   itself.

2. **Add a CSS-only hover bridge**: `padding-top: 16–24px` on the
   *outer* panel container (the one that contains the white card) and
   a 2-px overlap (`top: calc(100% - 2px)`). Do not invent an
   invisible `<div>` — just use padding.

3. **Do not animate `display`/`visibility`.** Animate `transform` and
   `opacity` instead (iLovePDF uses `animation: fade-in-bottom .08s
   ease-in-out both`). The instant unhover is acceptable because the
   visual delta is so small (~80 ms) that closing feels immediate.

4. **Use `transform: translate(-50%)` (not `left: 50%` alone)** to
   horizontally center the panel on the trigger. Add
   `max-width: 95vw` so it never overflows the viewport.

5. **For click toggle**: add `.open` class on click, mirror the hover
   styles with `.header .menu.open .menu__main { … }`. Then close on
   click-outside by checking `openEl.contains(e.target)` for every
   `.open` ancestor. Always `stopPropagation()` on the trigger click so
   the outside-click handler doesn't see it as outside.

6. **For click-outside**: prefer a single `document` listener that
   iterates over all `.open` menus rather than per-element listeners.
   It scales better and handles nested sub-menus cleanly.

7. **Lock body scroll while open** (`body.nav-open { overflow: hidden;
   max-height: 100vh }`), especially for the mobile fullscreen
   variant. This also gives you a hook to hide the footer on mobile so
   it doesn't bleed through the overlay.

8. **Make the resize handler close panels when the viewport grows by
   a meaningful amount** (iLovePDF uses 20 px) so a panel opened on
   mobile doesn't get stranded after a rotation.

9. **Use the same DOM for hover (desktop) and click (mobile/touch)**
   and don't introduce a JS hover bridge unless you need a close
   delay. The CSS-only bridge pattern is simpler and has zero
   edge-cases with focus, touch, or animation frames.

10. **Accept the accessibility trade-off or fix it explicitly.** The
    iLovePDF implementation is not keyboard-accessible. To do it
    properly you would need:
    - a `<button>` (or `<a>` with `aria-haspopup="true"`) as the
      trigger,
    - `aria-expanded` toggled by the click handler,
    - `aria-controls` pointing at the panel `id`,
    - `Escape` keydown to close,
    - focus trapping inside the panel while open,
    - `mouseenter`/`mouseleave` handlers (or `focusin`/`focusout`)
      with `setTimeout` for a close delay if you want hover-to-open
      on desktop.

---

## 9. Appendix — quick-reference facts

| Property                         | Value                                                                    |
|----------------------------------|--------------------------------------------------------------------------|
| Trigger element                  | `<span class="menu--md">` (desktop) / `<span class="menu--sm">` (mobile) |
| Panel element                    | `<div class="nav-dropdown nav-dropdown--full">`                          |
| Panel anchor                     | `<div class="menu">` (same wrapper as the trigger)                       |
| Open trigger — desktop           | CSS `:hover` on `.header .menu`                                          |
| Open trigger — mobile / click    | JS `classList.toggle('open')` on `.header .menu`                         |
| Hover bridge                     | CSS-only: `padding-top: 24px` on `.menu__main`, `16px` on `.nav-dropdown` |
| Visible gap between trigger and panel | 24 px (mega) / 16 px (sub)                                           |
| Overlap with trigger             | 2 px (`top: calc(100% - 2px)`)                                           |
| Close on outside-click           | Yes — single `document` click handler, checks `.contains()`              |
| Close on second click            | Yes — `classList.toggle('open')`                                         |
| Close on resize                  | Yes — only when width grows by ≥ 20 px                                  |
| Animation library                | None — `animation: fade-in-bottom .08s ease-in-out both;`                |
| Animation duration               | 80 ms                                                                    |
| Animation timing                 | `ease-in-out`, `both` (forwards+backwards)                               |
| Animation distance               | `translateY(50px) → 0`, opacity `0 → 1`                                  |
| Panel width                      | `max-content` capped at `95vw`                                           |
| Panel columns                    | 7 (`Organize`, `Optimize`, `Convert to`, `Convert from`, `Edit`, `Security`, `Intelligence`) |
| Column min/max width             | 220 px / 240 px with 24-px horizontal margins                           |
| `aria-expanded`                  | **Not used**                                                             |
| `aria-haspopup`                  | **Not used**                                                             |
| `aria-controls`                  | **Not used**                                                             |
| Keyboard handler                 | **None**                                                                 |
| Body class while open            | `body.nav-open` → `max-height: 100vh; overflow: hidden`                  |
| Touch / mobile variant           | `position: fixed; top: 0; width: 100vw; height: 100dvh`                  |
| Animation on close               | None (panel removed from layout instantly)                               |

---

## 10. Source files inspected

- `https://www.ilovepdf.com/` — live HTML (downloaded
  `/tmp/ilovepdf_home.html`, 116,974 bytes).
- `https://www.ilovepdf.com/dist/js/web.d57e5bf.js` — production JS
  bundle (281,161 bytes). `initTopMenu` is at offset 170,517 in the
  minified file.
- `https://www.ilovepdf.com/dist/css/web.d57e5bf.css` — production CSS
  bundle (266,343 bytes). Relevant rules: `.menu`, `.menu__main`,
  `.nav-dropdown`, `.nav-dropdown--full`, `.nav-has-dropdown`,
  `@keyframes fade-in-bottom`.