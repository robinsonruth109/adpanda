# Railway deployment retry — 2026-10-22

Documentation-only commit to trigger a fresh build from `feature/platform-foundation` after the Railway build outage.

- Railway service: `adpanda`
- Website: https://adpanda-production.up.railway.app
- Use GitHub-connected development branch above.
- Production rollout is still an early foundation; reviewed MySQL migrations and security testing are required before real merchant onboarding.
- If Railway is still impaired, this commit cannot make its build services healthy.
