# Explore Creator Gallery — Header Density Evidence

The stateful preview captures below are actual application captures from the same-origin development preview, taken before and after the density correction. The persistent preview update notice is unrelated application chrome and remains visible at the bottom; it does not cover the Explore header or Creator Gallery.

| State | Viewport | Evidence |
|---|---:|---|
| Before — actual application | stateful preview | [before-1280-stateful.webp](./before-1280-stateful.webp) |
| After — actual application | stateful preview | [after-1280-stateful.webp](./after-1280-stateful.webp) |
| Before — supplied design reference | — | [before-reference.png](./before-reference.png) |
| After — isolated capture | 1440px | [after-1440.png](./after-1440.png) |
| After — isolated capture | 1024px | [after-1024.png](./after-1024.png) |
| After — isolated capture | 768px | [after-768.png](./after-768.png) |
| After — isolated capture | 390px | [after-390.png](./after-390.png) |
| After — isolated capture | 375px | [after-375.png](./after-375.png) |
| After — isolated capture | 360px | [after-360.png](./after-360.png) |

The isolated captures cover all requested widths. The stateful browser geometry check at 1280px measured header 86.6px, toolbar 74.4px, Creator Gallery top 142.6px, and `document.documentElement.scrollWidth > innerWidth === false`. The six isolated captures were additionally used to inspect initial viewport composition, overflow, and bottom-player clearance; their runner's unrelated first-visit modal is not part of the application surface under review.
