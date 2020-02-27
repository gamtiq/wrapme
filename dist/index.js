
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./wrapme.cjs.production.min.js')
} else {
  module.exports = require('./wrapme.cjs.development.js')
}
