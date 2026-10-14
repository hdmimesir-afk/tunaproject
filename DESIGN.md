---
name: KATALIS ERP
description: Clear operational explanations for a seafood business pitch deck.
colors:
  ocean: "#176D9C"
  teal: "#178C87"
  navy: "#10283F"
  navy-deep: "#1E3B55"
  paper: "#F8FAFB"
  muted: "#404B54"
  low: "#F1F5F8"
  ice: "#D0E6F5"
  aqua: "#C9EDE9"
  border: "#C6CFD6"
  caution: "#F6E7C8"
  caution-text: "#7A4E00"
  white: "#FFFFFF"
  focus: "#9FDDD8"
typography:
  display:
    fontFamily: "Google Sans, system-ui, sans-serif"
    fontSize: "88px"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "Google Sans, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Google Sans, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.25
  label:
    fontFamily: "Google Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.25
rounded:
  panel: "8px"
  control: "6px"
spacing:
  canvas-margin: "100px"
  flow-gap: "38px"
components:
  flow-panel:
    backgroundColor: "{colors.ice}"
    textColor: "{colors.navy}"
    rounded: "{rounded.panel}"
  outcome-panel:
    backgroundColor: "{colors.aqua}"
    textColor: "{colors.navy}"
    rounded: "{rounded.panel}"
  risk-panel:
    backgroundColor: "{colors.caution}"
    textColor: "{colors.navy}"
    rounded: "{rounded.panel}"
---
# Design System: KATALIS ERP

## Overview

The incumbent navy, ocean blue, teal, and Google Sans form the visual identity. The system gives plain-language operational explanations enough space to read during a presentation. Flat diagrams and tonal surfaces connect a risk, a system mechanism, and information the team can see.

**Key Characteristics:**
- One message per slide.
- Semibold slide titles, feature headings and important figures; regular explanatory copy and footnotes.
- Flat comparisons and process diagrams.
- Examples and proposed features remain labelled.

## Colors

Ocean blue marks processes and section statements. Teal marks outcomes; pale aqua groups results. Navy anchors text and the opening/closing slides. Cool paper is the light slide background, muted charcoal supports secondary text, and pale amber identifies risks. The token values above preserve the incumbent palette.

## Typography

Display and body use Google Sans with system sans-serif fallback. Regular weight (400) preserves the incumbent treatment. General titles use the headline token; opening/closing headlines range from 84–88 px. Body text ranges mainly from 30–38 px; footers use 20–22 px. These are canvas sizes before viewport scaling.

## Layout

Slides are composed on a 1920 × 1080 canvas with a 100 px horizontal margin. General titles begin at y=88, subtitles at y=265, and footer dividers at y=970. Open comparisons, process ribbons, ledgers, calendars, and quantity diagrams vary the composition. The viewer scales the whole canvas to fit the viewport rather than reflowing the slide. Overview columns change at 768 and 1280 px; controls compact below 640 px.

## Elevation & Depth

Slide content uses flat tonal layering without shadows or gradients. The viewer adds a structural shadow outside the canvas to separate it from the dark presentation surround.

## Shapes

Rounded tonal rectangles group process steps, results, or risks. Thin horizontal rules separate sections. Arrows encode information movement. Ledger headers use navy with white text.

## Components

Process panels show a short action and explanation; the final step can use the outcome surface. Risk panels use the caution surface and an explanatory label. Ledgers compare a small number of records or options. Calendars explain partner schedules.

Viewer controls use translucent light backgrounds on a dark surround, stronger hover backgrounds, and visible mint focus outlines. Disabled navigation fades. The overview marks the active slide with a teal ring. Reduced motion suppresses slide fades and control transitions.

## Do's and Don'ts

- Do retain the incumbent palette and font.
- Do show what a team records, what happens next, and what they can inspect.
- Do label examples, assumptions, proposed features, and commercial estimates.
- Don't present proposed features as an installed system.
- Don't substitute miniature application chrome for a readable explanation.
- Don't claim exports match the localhost redesign until they are rebuilt and reviewed.
