---
---

Internal: `.github/workflows/release.yml` now post-processes prerelease publishes by repointing the `preview` dist-tag at the just-published versions, so users following the README's `npx -y @smarterweather/<pkg>@preview` instruction always resolve to the newest prerelease instead of the first-ever-published version. No published package behavior changes. Context: [SmarterWeather#8090](https://github.com/afisch710/SmarterWeather/issues/8090).
