# Deploy

Live URL:

https://baditaflorin.github.io/shaderwave-studio/

Publishing strategy:

GitHub Pages serves `main` branch `/docs`.

Manual publish:

```bash
make build
git add docs package.json package-lock.json
git commit -m "chore: publish pages build"
git push origin main
```

Rollback:

```bash
git revert <publishing-commit-sha>
git push origin main
```

Custom domain:

No custom domain is configured in v1. If one is added, create `docs/CNAME`, set DNS CNAME/ALIAS records to GitHub Pages, and update ADR 0010.
