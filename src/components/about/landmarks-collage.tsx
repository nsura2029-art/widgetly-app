import React from "react";

/**
 * Famous USA landmarks featured on the About page.
 * Assets live in /public/images/landmarks/*.svg and are hand-drawn
 * SVGs that match the Widgetly brand palette.
 */
export const LANDMARKS = [
  {
    name: "Statue of Liberty",
    location: "New York",
    file: "liberty.svg",
    blurb: "The beacon of freedom welcoming the world since 1886.",
  },
  {
    name: "Golden Gate Bridge",
    location: "San Francisco",
    file: "golden-gate.svg",
    blurb: "An icon of engineering against the Pacific fog.",
  },
  {
    name: "Niagara Falls",
    location: "New York / Ontario",
    file: "niagara.svg",
    blurb: "Thunderous waters where three borders meet.",
  },
  {
    name: "Grand Canyon",
    location: "Arizona",
    file: "grand-canyon.svg",
    blurb: "Two billion years of geology carved by the Colorado.",
  },
  {
    name: "Las Vegas Strip",
    location: "Nevada",
    file: "las-vegas.svg",
    blurb: "Neon, spectacle, and a skyline lit around the clock.",
  },
  {
    name: "Disneyland",
    location: "California",
    file: "disneyland.svg",
    blurb: "The original magic kingdom, opening doors in 1955.",
  },
  {
    name: "NASA",
    location: "Florida / Texas",
    file: "nasa.svg",
    blurb: "Where humanity launches its reach beyond the horizon.",
  },
  {
    name: "Mount Rushmore",
    location: "South Dakota",
    file: "mount-rushmore.svg",
    blurb: "Four presidents carved into the Black Hills.",
  },
  {
    name: "The White House",
    location: "Washington, D.C.",
    file: "white-house.svg",
    blurb: "The seat of American democracy since 1800.",
  },
] as const;

type Variant = "collage" | "team";

/**
 * LandmarksCollage — a responsive grid of USA landmark illustrations.
 *
 * Two variants:
 *   - "collage" : full-bleed showcase grid (used in the main About section)
 *   - "team"    : compact 3-up thumbnails (used inline on the team cards)
 */
export function LandmarksCollage({ variant = "collage" }: { variant?: Variant }) {
  if (variant === "team") {
    return (
      <div className="mt-6 grid grid-cols-3 gap-3">
        {LANDMARKS.slice(0, 3).map((l) => (
          <figure
            key={l.file}
            className="group border-border/60 overflow-hidden rounded-md border bg-white/5"
          >
            <div className="relative aspect-square w-full">
              {/* Local SVG in /public — next/image not needed. Width/height
                  attrs reserve aspect-ratio box to keep CLS at 0; intrinsic
                  size of 512 matches the asset's natural draw size. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/landmarks/${l.file}`}
                alt={`${l.name} illustration`}
                width={512}
                height={512}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <figcaption className="text-muted px-2 py-1.5 text-[10px] font-medium">
              {l.name}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
      {LANDMARKS.map((l) => (
        <figure
          key={l.file}
          className="group border-border/60 hover:border-primary/40 relative overflow-hidden rounded-lg border bg-white/5 transition-colors"
        >
          <div className="relative aspect-square w-full">
            {/* Local SVG in /public — next/image not needed. Width/height
                attrs reserve aspect-ratio box to keep CLS at 0. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/landmarks/${l.file}`}
              alt={`${l.name} — ${l.location}`}
              width={512}
              height={512}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 px-3 py-2 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <div className="text-xs font-semibold">{l.name}</div>
              <div className="text-[10px] opacity-80">{l.location}</div>
            </div>
          </div>
          <figcaption className="flex items-baseline justify-between gap-2 px-3 py-2">
            <span className="text-foreground text-xs font-semibold">{l.name}</span>
            <span className="text-muted text-[10px]">{l.location}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
