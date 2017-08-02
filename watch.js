const { extname, relative } = require('path')
const { getViewNotFound, isViewNameRestricted, morph } = require('./lib.js')
const { readFile, readFileSync, statSync, writeFile } = require('fs')
const chalk = require('chalk')
const clean = require('./clean.js')
const globule = require('globule')
const toCamelCase = require('to-camel-case')
const toPascalCase = require('to-pascal-case')
const watch = require('gaze')

const isMorphedData = f => /\.data\.js$/.test(f)
const isMorphedView = f => /\.view\.js$/.test(f)

const isData = f => extname(f) === '.data'
const isJs = f => extname(f) === '.js'
const isView = f => extname(f) === '.view'
const isTests = f => extname(f) === '.tests'
const isLogic = f => /view\.logic\.js$/.test(f)

const relativise = (from, to) => {
  const r = relative(from, to)
  return r.substr(r.startsWith('../..') ? 3 : 1)
}

module.exports = options => {
  return new Promise((resolve, reject) => {
    let {
      as,
      compile,
      dataNotFound,
      inlineStyles,
      map,
      once,
      pretty,
      shared,
      src,
      logic: shouldIncludeLogic,
      tests: shouldIncludeTests,
      verbose,
      viewNotFound,
    } = Object.assign(
      {
        as: 'react-dom',
        compile: false,
        map: {},
        pretty: true,
        src: process.cwd(),
        once: false,
        verbose: true,
      },
      options
    )

    clean(src)

    if (!shared) shared = `views-blocks-${as}`
    if (!dataNotFound)
      dataNotFound = name => {
        const warning = `${src}/${name}.data doesn't exist but it is being used. Create the file!`
        verbose && console.log(chalk.magenta(`! ${warning}`))
        return getViewNotFound('data', name, warning)
      }

    if (!viewNotFound)
      viewNotFound = name => {
        const warning = `${src}/${name}.view doesn't exist but it is being used. Create the file!`
        verbose && console.log(chalk.magenta(`! ${warning}`))
        return getViewNotFound(as, name, warning)
      }

    const jsComponents = {}
    const isJsComponent = f => {
      if (jsComponents.hasOwnProperty(f)) return jsComponents[f]
      let is = false

      try {
        const content = readFileSync(f, 'utf-8')
        is = /\/\/ @view/.test(content)
      } catch (err) {}

      return (jsComponents[f] = is)
    }

    const filter = fn => (f, a) => {
      if (
        isMorphedView(f) ||
        isMorphedData(f) ||
        (isJs(f) && !isLogic(f) && !isJsComponent(f)) ||
        (!shouldIncludeLogic && isLogic(f)) ||
        statSync(f).isDirectory()
      )
        return

      return fn(f, a)
    }

    const getImportFileName = name => {
      const f = views[name] || data[name]
      if (isData(f)) {
        return `${f}.js`
      } else if (isView(f)) {
        return logic[`${name}.view.logic`] || `${f}.js`
      } else {
        return f
      }
    }

    const views = map
    const data = {}
    const logic = {}
    const tests = {}

    const addView = filter((f, skipMorph = false) => {
      const { file, view } = toViewPath(f)

      if (isViewNameRestricted(view, as)) {
        verbose &&
          console.log(
            chalk.magenta('X'),
            view,
            chalk.dim(`-> ${f}`),
            'is a Views reserved name. To fix this, change its file name to something else.'
          )
        return
      }

      const fileIsData = isData(file)

      verbose && console.log(chalk.yellow('A'), view, chalk.dim(`-> ${f}`))

      let shouldMorph = isView(file)

      if (fileIsData) {
        data[view] = file
        shouldMorph = true
      } else if (isTests(file)) {
        tests[view] = file
        shouldMorph = true
      } else if (isLogic(file)) {
        logic[view] = file
      } else {
        views[view] = file
      }

      if (shouldMorph) {
        if (skipMorph) {
          return f
        } else {
          morphView(f)
        }
      }
    })

    const addViewSkipMorph = f => addView(f, true)

    const morphView = filter(f => {
      const { file, view } = toViewPath(f)
      if (isViewNameRestricted(view, as)) {
        verbose &&
          console.log(
            chalk.magenta('X'),
            view,
            chalk.dim(`-> ${f}`),
            'is a Views reserved name. To fix this, change its file name to something else.'
          )
        return
      }

      // TODO if the file doesn't exist, add it to wherever it belongs

      if (isJs(f)) return

      const getImport = name => {
        // TODO track dependencies to make it easy to rebuild files as new ones get
        // added
        if (isData(name)) {
          return data[name]
            ? `import ${toCamelCase(name)} from '${relativise(
                file,
                getImportFileName(name)
              )}'`
            : dataNotFound(name)
        } else {
          return views[name]
            ? `import ${name} from '${relativise(
                file,
                getImportFileName(name)
              )}'`
            : viewNotFound(name)
        }
      }

      readFile(f, 'utf-8', (err, source) => {
        if (err) {
          return verbose && console.error(chalk.red('M'), view, err)
        }

        try {
          const code = morph(source, {
            as: isData(f) ? 'data' : isTests(f) ? 'tests' : as,
            compile,
            inlineStyles,
            file: { raw: f, relative: file },
            name: view,
            getImport,
            pretty,
            tests: tests[`${view}.view.tests`],
            views,
          })

          writeFile(`${f}.js`, code, err => {
            if (err) {
              return verbose && console.error(chalk.red('M'), view, err)
            }

            if (viewsLeftToBeReady > 0) {
              viewsLeftToBeReady--

              if (viewsLeftToBeReady === 0) {
                resolve()
              }
            }

            verbose && console.log(chalk.green('M'), view)
          })
        } catch (err) {
          return verbose && console.error(chalk.red('M'), view, err)
        }
      })
    })

    const toViewPath = f => {
      const file = relative(src, f)
      const view =
        isData(file) || isTests(file)
          ? file
          : isLogic(file)
            ? file.replace(/\.js/, '').replace(/\//g, '')
            : toPascalCase(file.replace(/\.(view|js)/, ''))

      return {
        file: `./${file}`,
        view,
      }
    }

    const watcherOptions = {
      filter: f => !/node_modules/.test(f) && !isMorphedView(f),
    }
    const watcherPattern = [
      `${src}/**/*.data`,
      `${src}/**/*.js`,
      `${src}/**/*.view`,
      shouldIncludeLogic && `${src}/**/*.view.logic.js`,
      shouldIncludeTests && `${src}/**/*.view.tests`,
    ].filter(Boolean)

    const viewsToMorph = globule
      .find(watcherPattern, watcherOptions)
      .map(addViewSkipMorph)
      .filter(Boolean)

    let viewsLeftToBeReady = viewsToMorph.length
    viewsToMorph.forEach(morphView)

    if (!once) {
      watch(watcherPattern, watcherOptions, (err, watcher) => {
        if (err) {
          verbose && console.error(err)
          return
        }

        // TODO see how we can force a rebuild when a file gets added/deleted
        watcher.on('added', addView)
        watcher.on('changed', morphView)
        watcher.on(
          'deleted',
          filter(f => {
            const { view } = toViewPath(f)
            if (isViewNameRestricted(view, as)) return

            verbose && console.log(chalk.blue('D'), view)

            if (isData(f)) {
              delete data[view]
            } else if (isTests(f)) {
              delete tests[view]
            } else if (isLogic(f)) {
              delete logic[view]
            } else {
              delete views[view]
            }
          })
        )
      })
    }
  })
}
