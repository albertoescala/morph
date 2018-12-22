import SVG from './svg.js'

const NATIVE = [
  'Animated',
  'Image',
  'KeyboardAvoidingView',
  'FlatList',
  'ScrollView',
  'StyleSheet',
  'Text',
  'TextInput',
  'TouchableWithoutFeedback',
  'TouchableHighlight',
  'View',
]

const sortAlphabetically = (a, b) => {
  return a === b ? 0 : a < b ? -1 : 1
}

const importsFirst = (a, b) => {
  const aIsImport = a.startsWith('import')
  const bIsImport = b.startsWith('import')

  if ((aIsImport && bIsImport) || (!aIsImport && !bIsImport))
    return sortAlphabetically(a, b)

  if (aIsImport) return -1
  if (bIsImport) return 1
}

const getExtension = (as, shouldWriteBoth) =>
  shouldWriteBoth && as === 'react-dom'
    ? '.web.js'
    : shouldWriteBoth && as === 'react-native'
      ? '.native.js'
      : as === 'e2e'
        ? '.page.js'
        : '.js'

export default (state, getImport) => {
  const usesNative = []
  const usesSvg = []

  const useNative = d => {
    if (!usesNative.includes(d)) {
      usesNative.push(d)
    }
  }
  const useSvg = d => {
    if (!usesSvg.includes(d)) {
      usesSvg.push(d)
    }
  }

  const dependencies = [`import React from 'react'`]

  state.uses.sort().forEach(d => {
    const fileName = `.${d}${getExtension(
      state.isReactNative ? 'react-native' : 'react-dom',
      state.shouldWriteBoth
    )}`
    if (state.isReactNative && NATIVE.includes(d)) {
      useNative(d)
    } else if (state.isReactNative && SVG.includes(d)) {
      useSvg(
        d === 'Svg'
          ? d
          : d === 'SvgGroup'
            ? `G as SvgGroup`
            : `${d.replace('Svg', '')} as ${d}`
      )
    } else if (d.endsWith('SvgInline')) {
      debugger
      dependencies.push(`import ${d} from "${fileName}"`)
    } else if (d === 'Table') {
    } else if (/^[A-Z]/.test(d)) {
      debugger
      dependencies.push(getImport(d, state.lazy[d], fileName))
    }
  })

  if (state.isReactNative) {
    state.getFont(state.fonts)
  } else {
    debugger
    dependencies.push(getImport('ViewsBaseCss'))

    state.fonts.forEach(usedFont => {
      const font = state.getFont(usedFont)
      if (font) {
        dependencies.push(`import "${font}"`)
      }
    })
  }

  // TODO we probably want to check that the file exists and do something if it
  // doesn't, like warn the user at least?
  state.images.forEach(img =>
    dependencies.push(`import ${img.name} from "${img.file}"`)
  )

  if (state.cssDynamic || state.cssStatic) {
    dependencies.push('import { css } from "emotion"')
    state.dependencies.add('emotion')
  }

  if (state.isAnimated) {
    const animations = [
      'animated',
      (state.hasSpringAnimation ||
        (state.hasTimingAnimation && state.isReactNative)) &&
        'Spring',
    ].filter(Boolean)

    if (animations.length > 0) {
      dependencies.push(
        `import { ${animations.join(', ')} } from "react-spring"`
      )

      state.dependencies.add('react-spring')

      if (state.hasTimingAnimation && state.isReactNative) {
        dependencies.push(`import * as Easing from 'd3-ease'`)
        state.dependencies.add('d3-ease')
      }
    }
  }

  if (state.isReactNative) {
    for (let component of state.animated) {
      dependencies.push(`let Animated${component} = animated(${component})`)
    }
  }

  if (state.isTable) {
    dependencies.push(
      `import { AutoSizer, Column, Table } from "@viewstools/tables/${
        state.isReactNative ? 'native' : 'dom'
      }"`
    )
    state.dependencies.add('@viewstools/tables')
  }

  if (usesSvg.length > 0) {
    const svg = usesSvg.filter(m => m !== 'Svg').join(', ')
    dependencies.push(`import Svg, { ${svg} } from 'react-native-svg'`)
  }

  if (usesNative.length > 0) {
    dependencies.push(`import { ${usesNative.join(', ')} } from 'react-native'`)
  }

  if (state.track) {
    dependencies.push(getImport('TrackContext'))
  }

  if (Object.keys(state.locals).length > 0) {
    dependencies.push('import { Subscribe } from "unstated"')
    dependencies.push(getImport('LocalContainer'))
    state.dependencies.add('unstated')
  }

  return dependencies
    .filter(Boolean)
    .sort(importsFirst)
    .join('\n')
}
