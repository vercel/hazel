# Hazel

[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![Slack Channel](http://zeit-slackin.now.sh/badge.svg)](https://zeit.chat/)

This project lets you deploy an update server for [Electron](https://electron.atom.io) apps with ease: You only need to run a single command and fill out two text fields. The result will be faster and more lightweight than any other solution out there!

- Pulls the latest release data from [GitHub Releases](https://help.github.com/articles/creating-releases/) and caches it
- Refreshes the cache every 15 minutes
- When asked for an update, it returns the link to the GitHub asset directly
- Supports Windows and macOS apps
- Allows downloading the latest release for a platform: e.g. `/download/darwin`

## Usage

Firstly, ensure that [Now CLI](https://zeit.co/download) is installed, then deploy an update server like this:

```bash
now -e NODE_ENV="production" zeit/hazel
```

Now you'll be asked for the value of three environment variables:

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

## Contributing

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device
2. Then move into the directory of your clone: `cd hazel`
3. Finally, run the development server like this: `npm run dev`

## Credits

Huge thanks to my ([@leo](https://github.com/leo)'s) friend [Andy](http://twitter.com/andybitz_), who suggested the name "Hazel" (since the software that handles the auto updating inside [Electron](https://electron.atom.io) is called "Squirrel") and [Matheus](https://twitter.com/matheusfrndes) for collecting ideas with me.

## Author

Leo Lamprecht ([@notquiteleo](https://twitter.com/notquiteleo)) - [▲ZEIT](https://zeit.co)
