# HBT Golf League — Version 6

Changes in V6:
- Corrected headshot mapping:
  - prior Davis image -> Frankenberg
  - prior Frankenberg image -> Mayer
  - prior Mayer image -> Davis
- Removed the bottom mobile navigation.
- Added a pulldown menu on mobile and desktop.
- Removed Standings as a separate primary page.
- Home page now includes:
  - Florida golf-course hero
  - current leaderboard
  - round-by-round table titled "2026 Points"
  - latest scorecard
  - league highlights
- Kept Rounds, Players, Handicaps, Stats, and Records as primary menu destinations.
- 2026 Points is the only intentionally wide home section and scrolls inside its own container.


## V7 player-page structure
Player pages now make the scope of every number explicit:
1. 2026 Season — current-season points, wins, avg finish, results and points by round.
2. HBT Handicap — current handicap, all-available trend and best-8-of-last-20 calculator.
3. Career · All-Time — all historical score/handicap data currently available.

Career finishing-position metrics are intentionally not displayed until the workbook contains complete prior-season finish data.


## V7 Fixed
Corrected a JavaScript syntax error in the page router that caused the home page to render blank and disabled the pulldown menu.


## V8
- Added 2026 player stats for GIR, Driving Accuracy and Putts per 9, including league rank.
- Rounds are newest-to-oldest.
- Every completed round has a full compact scorecard with Fin / Player / Gross / HCP / Adj.
- Round scorecards fit phone width without horizontal scrolling.
- Replaced hero with a clean Florida course image and removed HBT Golf League text from the hero.


## V9 — Premium redesign
- Cinematic near-full-screen Florida course hero
- Editorial typography, more whitespace and fewer visual boxes
- Featured current leader and top-three podium
- Full-width photographic season break
- Larger, more dramatic player profile heroes
- Oversized 2026 metrics
- Signature handicap presentation
- Animated stat bars and scroll-triggered content reveals
- Soft page transitions and touch feedback
- Translucent blurred navigation and hero overlays
- Reduced-motion accessibility support
- Existing league data, rounds, handicaps, stats and records preserved


## V9.1 Fix
Fixed runtime data references in the premium redesign and corrected hash navigation initialization. This package passes a runtime smoke test rendering Home, Rounds, and all six player pages.


## V10
- Home has no green top bar; the menu floats over the hero.
- HBT logo is centered on the home hero image.
- All six leaderboard rows use the same premium card layout.
- Rounds are newest-first.
- Every completed round shows Fin / Player / Gross / HCP / Adj.
- Round scorecards fit phone width without horizontal scrolling.
- Player headshots use contained positioning so the full supplied circular image stays centered and is not cropped.
- All non-home pages retain the green top navigation bar.


## V12
- Reverted to the cleaner V10 hero behavior.
- Restored the previous Florida golf-course hero image.
- Removed the centered logo from the hero.
- Hero now reads “HBT TOUR” in large type with “2026 Season” underneath.
- Menu remains floating in the upper-right.
- Leaderboard starts fully below the hero with no overlap or rounded encroachment.


## V14.1 hero photograph
The homepage hero now uses the native high-resolution Wikimedia Commons source
(available at 6,048 × 4,024; the site requests a 3,840 px derivative).

Photo: PattayaPatrol
License: CC BY-SA 4.0
Source: https://commons.wikimedia.org/wiki/Special:Redirect/file/DZ6_2432_Sunlit_morning_on_the_fairway_-_golf_carts_waiting_as_players_tee_off_under_swaying_palm_trees.jpg?width=3840


## V15
- Replaced the homepage hero with the user-supplied golf-course photograph.
- Removed Wikimedia hero attribution.
- Restored the original headshot image files without recropping them.
- Applied the corrected photo mapping:
  - Frankenberg = original photo previously assigned to Davis
  - Mayer = original photo previously assigned to Frankenberg
  - Davis = original photo previously assigned to Mayer
  - Garesche and Bender retain their original photos
- All headshots now use `object-fit: contain` so the full circular portrait remains centered and visible.


## V16
- Replaced the HBT TOUR text in the homepage hero with the actual HBT logo asset.
- Added a circular translucent black glass background behind the white logo.
- Kept the 2026 Season label below the logo.
- Menu remains in the upper-right over the hero.


## V17
- Moved “2026 Season” directly beneath the HBT hero logo.
- Replaced the darker circular glass background with a lighter, more transparent rounded glass panel.
- Re-centered player headshots vertically in the Around the Tour feature cards.
- Prevented feature-card headshots from being clipped at the bottom/right.
- Vertically centered the text content within those cards.
- The homepage status line now cycles through all six players:
  - leader shows current points
  - every other player shows how many points behind the leader they are
- Status changes use a subtle fade/slide transition.


## V18
- Hero logo/text now sit on a simple transparent black background, with no glass blur.
- 2026 Points redesigned as a compact round-by-round matrix that fits phone width.
- Latest Round now links directly to the Rounds/scorecards page.
- The Race includes all six players.
- Added a full website footer with branding, navigation, season info, and copyright.
- Player-card portraits are vertically centered and no longer sit low in the frame.
- Player season results table fits phone width without horizontal scrolling.
- Handicap charts now include a numeric y-axis scale.
- Removed “All Available Data” wording.
- Handicap calculator now fits phone width; course names are shortened for mobile.


## V19
- Centered HBT logo/2026 Season vertically in the hero.
- Replaced the compact logo box with a darker transparent black band spanning the full hero width.
- Aligned “Round 14 Complete” vertically with the rotating player-gap text.
- Latest Round no longer says who takes the win; link now reads “View all scorecards”.
- Reduced card corner radii across the site to roughly half their previous size.
- Rebuilt footer to be much shorter and removed the HBT logo and “Built for the group chat.”
- Player-grid portraits remain vertically centered.
- Handicap trend SVG now preserves its aspect ratio so text is not vertically stretched.
- Handicap calculator uses content-fit column widths.
- Records navigation/page terminology changed to “Course Records”.


## V20
- Replaced homepage hero with the newly attached golf-course image.
- Handicap trend chart is twice as tall and y-axis text is twice as large.
- Current handicap displays now show:
  - green down arrow when handicap improves from prior round/week
  - red up arrow when handicap increases
  - no arrow when unchanged
- Home 2026 Points marks each player’s two lowest round-point values in red with strikethrough.
- Removed the league/current-leader handicap trend card from the main Handicaps page.
- Latest Round “View all scorecards” is aligned on the left beneath the round/date text.
- Handicap calculator columns are wider and content-sized while still fitting phone width.
- Course abbreviations shortened further for mobile.
- Tables use content-aware column sizing and are constrained to the page width without horizontal scrolling.


## V21
- Restored the green top bar and HBT logo on the homepage.
- Homepage top bar is translucent so the hero image remains visible behind it.
- Restored a circular transparent black backdrop behind the hero HBT logo and 2026 Season text.
- Replaced the hero with the newly attached golf-course photograph.
- Added a one-time CRT/TV-style power-on reveal on first homepage load.
- The TV intro respects reduced-motion accessibility settings.


## V21.1
- Reduced the weight of the red crossed-out dropped scores in the 2026 Points table.
- Hero video is not bundled because the requested Shingle Creek Golf video is a third-party copyrighted asset. The site can be switched to a supplied/licensed MP4 without changing the rest of the layout.


## V22
- Replaced the static homepage hero with the supplied MP4.
- Video autoplays muted, loops, uses playsinline for iPhone, and retains the prior hero photo as fallback.
- Added a restrained skate-video treatment: higher contrast, muted saturation, subtle sepia, vignette, fine scanlines, slight red/blue analog edge separation, and a slow push-in.
- Preserved the translucent green header, circular HBT logo treatment, status strip, and TV-on entrance effect.


## V23
- Uses the supplied original hero video with no color/filter/scanline treatment and no push-in.
- Enlarged and precisely centered the circular HBT logo + 2026 Season lockup.
- Darkened the transparent black circle.
- Added a stronger black fade toward the bottom of the hero for white-text legibility.
- Homepage navigation bar is now dark transparent black rather than green.
- Removed the HBT logo from the homepage navigation bar only.
- Darkened the homepage menu treatment and bottom hero status background.


## V24
- Homepage now uses the same HBT green header as the rest of the site.
- Header is shorter and more Apple-like.
- Header is sticky on scroll.
- Added translucent glass blur/saturation treatment.
- Restored a small HBT logo in the top-left on Home.
- Reduced menu control size to match the compact header.


## V25
- Header forced into true sticky document-flow behavior.
- Homepage header changed to transparent glass.
- Non-home pages retain green glass.
- Restored the earlier dropdown menu styling/behavior.
- Hero video shortened vertically.
- Centered the logo circle precisely in the hero.
- Removed the opaque/dark hero status background.
- Added a smooth bottom fade over the video itself so white status text remains readable.


## V26
- Standardized the top navigation across every route.
- Same HBT green transparent glass background on Home, Rounds, Players, Handicaps, Stats, and Course Records.
- Same compact height, small HBT logo, menu button, blur, saturation, and border everywhere.
- Reinforced sticky positioning for Safari/iOS and desktop browsers.


## V27
- Replaced the top-right Menu text control with a clean three-line hamburger.
- Header now uses fixed positioning to guarantee persistent on-scroll behavior on iOS/Safari and desktop.
- Header is visibly translucent HBT-green glass on every page.
- Removed the legacy TV power-on animation completely.
- Removed all static hero-image background/fallback CSS.
- Homepage hero now uses only the supplied MP4 video, plus a smooth bottom readability gradient.
- Removed scanline/analog treatment layers.


## V28
- Restored the thin white divider above “Round 14 Complete” and the rotating player status.
- Vertically aligned both status labels on the same row.
- Repositioned the HBT logo circle so it is centered between the bottom of the fixed top bar and the restored divider rather than centered across the entire hero.


## V31
- Rebuilt the actual homepage hero in the Apple Pro-inspired direction.
- Removed transparent black circle behind the HBT artwork.
- Video is darker for contrast.
- “2026 Season” sits above a much larger glowing HBT logo.
- Glow uses layered white/warm drop shadows similar to illuminated display lettering.
- Replaced divider/status row with one wide pill across most of the hero.
- Pill retains “Through Round 14” and the existing rotating player leaderboard text.


## V32 — cinematic black intro
- Hero starts black.
- HBT logo fades in cleanly over black with no glow.
- “2026 Season” appears beneath the logo.
- Hero video then fades in behind the logo.
- Header, white divider, “Through Round 14”, and rotating leaderboard fade in after the video.
- Removed V31 pill background.
- Restored thin white horizontal divider above bottom status row.
- Cache-busting references updated to `?v=32`.


## V33 — full-screen site intro
- The entire browser viewport now starts solid black, including the area where the header and lower page content would be.
- HBT logo fades in centered on the full black viewport.
- The entire black screen then fades away, revealing the video hero and website beneath it.
- Header, white divider, Through Round 14, and rotating leaderboard appear after the reveal.
- Removed the V32 hero-only black curtain.
- Cache-busting updated to `?v=33`.


## V34 — slow hand-drawn logo intro
- Full website starts pure black.
- HBT logo is revealed as a slow drawing/tracing animation rather than a simple fade.
- Drawing takes about 3 seconds, then holds briefly.
- Full black screen then fades away slowly to the hero video.
- Header and bottom status UI appear after the hero is revealed.
- Cache-busting updated to `?v=34`.
- Added `assets/hbt-logo-draw.svg` for the drawing animation.


## V35 — simplified intro
- Entire page starts black.
- Original white HBT logo fades in.
- Logo is the actual homepage logo and starts exactly where it ends.
- No drawing effect, no movement, no scaling, no position change.
- Black overlay then fades away to reveal the homepage/video.
- 2026 Season, header, divider, and rotating status fade in afterward.
- Cache-busting updated to `?v=35`.


## V36
- Fixed hamburger navigation behavior.
- Hamburger now explicitly toggles the dropdown.
- `aria-expanded` stays synchronized.
- Menu closes when a nav link is tapped.
- Menu closes on outside tap or Escape.
- Menu remains functional after route changes.
- Cache-busting updated to `?v=36`.


## V37
- Fixed root cause of broken hamburger: removed duplicate menu click handlers that were toggling the menu twice.
- Menu now has one deterministic `onclick` implementation.
- Simplified intro to black → original logo fade → black fades away.
- Intro logo is measured from the real final logo's exact bounding rectangle, so the logo never moves, scales, or jumps.
- Removed all drawing, wipe, scale, and tracing effects.
- Cache-busting updated to `?v=37`.
- Validation: legacy menu click handlers remaining = 1; active menu onclick handlers = 1.


## V38
- Removed the final leftover legacy hamburger click listener.
- Confirmed there is now exactly one active menu toggle handler and zero old toggle handlers.
- Keeps the V37 stationary-logo intro.
- Cache-busting updated to `?v=38`.


## V39 — clean tournament-broadcast hero
- Removed all intro animation code and full-screen black intro layers.
- Hero video is visible immediately.
- 2026 Season above centered original HBT logo.
- No logo glow.
- No pill background.
- Thin white divider above live status.
- Through Round 14 on left; rotating leaderboard on right.
- Cache-busting updated to `?v=39`.
- Menu validation: legacy handlers=0, active deterministic handler=1.


## V40 — Stats page refinement
- Page heading changed from `Stats` to `2026 Stats`.
- Removed the League Analytics eyebrow and descriptive filler copy.
- Removed the redundant leader value and leader caption from each stat card.
- Each card now shows only the stat title followed directly by the ranking table.
- Player rows use full last names only; initials underneath were removed.
- Removed the green stat/record band at the bottom of the Stats page.
- Added subtle staggered scroll-in animation for stat cards and rows.
- Cache busting updated to `?v=40`.
