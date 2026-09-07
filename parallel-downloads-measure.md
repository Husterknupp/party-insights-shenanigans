# Measurements

`npm run parallel-downloads`

Wikipedia server: "upload.wikimedia.org"

Measured on Oracle's infrastructure

| # of Image URLs | Status Codes | Wall Clock time | Mode |
|---|---|---|--|
| 54 | 429 x24 | 1.055s | `e9d52ae` |
| 54 | 429 x24 | 1.079s | `e9d52ae` |
| 50 | 429 x20 | 0.676s | `maxSockets: 3` and `Referer` header, `bd40a2c` |
