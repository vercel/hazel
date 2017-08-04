# Hazel

[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![Slack Channel](http://zeit-slackin.now.sh/badge.svg)](https://zeit.chat/)

This project lets you deploy an update server for [Electron](https://electron.atom.io) apps with ease: You only need to run a single command and fill out two text fields.

The result will be faster and more lightweight than any other solution out there (~200 LOC)! :rocket:

- Pulls the latest release data from [GitHub Releases](https://help.github.com/articles/creating-releases/) and caches it in memory
- Built on top of [micro](https://github.com/zeit/micro), the tiniest HTTP framework for Node.js
- Refreshes the cache every 15 minutes (use `INTERVAL` environment value for custom number of minutes - [more](https://developer.github.com/changes/2012-10-14-rate-limit-changes/))
- When asked for an update, it returns the link to the GitHub asset directly (saves bandwidth)
- Supports macOS and Windows apps
- Let's you download the latest release for a platform: e.g. `/download/darwin`
- Scales very nicely across multiple [Now](https://zeit.co/now) instances

## Usage

With [Now CLI](https://zeit.co/download), you can deploy an update server like this:

```bash
now -e NODE_ENV="production" zeit/hazel
```

You'll be asked for the value of three environment variables:

- `ACCOUNT`: Your username or organisation name on GitHub
- `REPOSITORY`: The name of the repository to pull releases from

Once it's deployed, paste the deployment address into your auto updater code:

```js
const { app, autoUpdater } = require('electron')
const { resolve } = require('url')

const server = <your-deployment-url>
const feed = resolve(server, 'update', process.platform, app.getVersion())

autoUpdater.setFeedURL(feed)
```

That's it! :white_check_mark:

From now on, the auto updater will ask your Hazel deployment for updates!

## Routes

### /

Automatically detects the platform/OS of the visitor by parsing the user agent and then downloads the appropiate copy of your application.

If the latest version of the application wasn't yet pulled from [GitHub Releases](https://help.github.com/articles/creating-releases/), it will return a message and the status code `404`. The same happens if the latest release doesn't contain a file for the detected platform.

### /download

Does the same as `/` (basically an alias).

### /download/:platform

Accepts a platform (like "darwin" or "win32") to download the appropiate copy your app for. I generally suggest using either `process.platform` ([more](https://nodejs.org/api/process.html#process_process_platform)) or `os.platform()` ([more](https://nodejs.org/api/os.html#os_os_platform)) to retrieve this string.

If the cache isn't filled yet or doesn't contain a download link for the specified platform, it will respond like `/`.

### /update/:platform/:version

Checks if there is an update avaiable by reading from the cache.

If the latest version of the application wasn't yet pulled from [GitHub Releases](https://help.github.com/articles/creating-releases/), it will return the `204` status code. The same happens if the latest release doesn't contain a file for the specified platform.

## Contributing

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device
2. Move into the directory of your clone: `cd hazel`
3. Run the development server: `npm run dev`

## Credits

Huge thanks to my ([@leo](https://github.com/leo)'s) friend [Andy](http://twitter.com/andybitz_), who suggested the name "Hazel" (since the auto updater software inside [Electron](https://electron.atom.io) is called "Squirrel") and [Matheus](https://twitter.com/matheusfrndes) for collecting ideas with me.

## Author

Leo Lamprecht ([@notquiteleo](https://twitter.com/notquiteleo)) - [▲ZEIT](https://zeit.co)
