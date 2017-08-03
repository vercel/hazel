# electron-updates

Lighweight update server for Electron apps published with GitHub Releases

## Usage

Firstly, ensure that [Now CLI](https://zeit.co/download) is installed, then deploy an update server like this:

```bash
now leo/electron-updates
```

Now you'll be asked for the value of three environment variables:

- `NODE_ENV`: Should be set to "production" to disable the installation of the `devDependencies`
- `ACCOUNT`: Your username or organisation name on GitHub
- `REPOSITORY`: The name of the repository to pull releases from

Once the deployment has finished, paste the address into your auto updater:

```js
const { app, autoUpdater } = require('electron')
const { platform } = process
const { getVersion } = app

const feedURL = `<your-deployment-url>/update/${platform}/${getVersion()}`
autoUpdater.setFeedURL(feedURL)
```

That's all! :tada:
