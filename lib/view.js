// Native
const path = require('path')
const fs = require('fs')
const { promisify } = require('util')

// Packages
const { compile } = require('handlebars')

const readFileAsync = promisify(fs.readFile)

module.exports = async () => {
  const viewPath = path.normalize(path.join(__dirname, '/../views/index.hbs'))

  const viewContent = await readFileAsync(viewPath, 'utf8')

  return compile(viewContent)
}
