// Native
const path = require('path')
const fs = require('fs')
const { promisify } = require('util')

// Packages
const { compile } = require('handlebars')

const readFileAsync = promisify(fs.readFile)

module.exports = async () => {
  let viewContent = false
  const viewPath = path.normalize(path.join(__dirname, '/../views/index.hbs'))

  try {
    viewContent = await readFileAsync(viewPath, { encoding: 'utf8' })
  } catch (err) {
    throw err
  }

  return compile(viewContent)
}
