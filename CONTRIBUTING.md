# Contributing

Thanks for helping improve Shaderwave Studio.

Local checks:

```bash
npm install
make install-hooks
make lint
make test
make smoke
```

Use Conventional Commits:

```text
feat: add shader preset
fix: guard unsupported audio decode
docs: update deploy notes
```

Do not commit secrets, generated credentials, private keys, or real `.env` files.
