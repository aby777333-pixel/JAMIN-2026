# Screen background images

Drop the countryside/landscape illustrations here, then they get wired to
screens via `ImageBackdrop` (src/components/brand/ImageBackdrop.tsx).

**Use these exact file names** (PNG or JPG — keep them reasonably sized, ~1–2 MB each):

| File              | Screen it backs        |
| ----------------- | ---------------------- |
| `home.jpg`        | Home (tabs/index)      |
| `wallet.jpg`      | Wallet                 |
| `card.jpg`        | Digital Card           |
| `forms.jpg`       | Applications & Forms   |
| `network.jpg`     | Network (optional)     |

After the files are in this folder, the screens reference them with
`require('@/../assets/images/backgrounds/<name>.jpg')` through `ImageBackdrop`.
