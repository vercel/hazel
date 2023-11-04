# Carrots

TypeScript-based Electron downloads and updates server that uses GitHub to serve files.

## Setup

1. Create a `.env` file in the root with these variables;
   1. `ACCOUNT` Repository account name
   2. `REPOSITORY` Repository name
   3. `TOKEN` (optional) GitHub Private Token for private repos

## Development

1. `pnpm i`
2. `vercel dev`

## Testing

- Adjust the `private.test.ts` to match your own repo's release files
- `pnpm test`

## Production

- It is simply a `node.http` handler, use anywhere you like
- Vercel can deploy and run it as-is using the provided config

## Routes

- **Homepage**\
  _Route:_ `/`\
  _Description:_ A nice frontend to show the latest version and all downloads
- **API**\
  _Route:_ `/api/semver`\
  _Description:_ An endpoint to get the latest version number
- **Download**\
  _Route:_ `/download/:platform`\
  _Description:_ Downloads for most Electron platforms
- **Electron autoUpdater**\
  _Route:_ `/update/:platform/:version`\
  _Description:_ Electron autoUpdater endpoint for Mac and Windows
- **Update Metadata**\
  _Route:_ `/update/:platform/:version/RELEASES`\
  _Description:_ Electron autoUpdater `nupkg` endpoint for Windows

## Support

| OS      | Filetype  | As       | Supported |
| ------- | --------- | -------- | --------- |
| Linux   | .deb      | Download | Yes       |
| Linux   | .rpm      | Download | Yes       |
| Linux   | .AppImage | Download | Yes       |
| Linux   | .snap     | Download | Yes       |
| Linux   | .flatpak  | Download | No        |
| Windows | .exe      | Download | Yes       |
| Windows | .exe      | Download | No        |
| Windows | .nupkg    | Update   | Yes       |
| Mac     | .dmg      | Download | Yes       |
| Mac     | .zip      | Download | Yes       |
| Mac     | .zip      | Update   | Yes       |

## Thanks

Shamelessly based on and made possible thanks to;

- [vercel/hazel](https://github.com/vercel/hazel)
- [electron/update.electronjs.org](https://github.com/electron/update.electronjs.org)
