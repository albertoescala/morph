import { getProp, hasProp, isSlot } from '../utils.js'
import toPascalCase from 'to-pascal-case'

export default (node, parent, state) => {
  switch (node.name) {
    case 'Capture':
    case 'CaptureTextArea':
      return 'TextInput'

    case 'Horizontal':
    case 'Vertical':
      return getGroupBlockName(node, state)

    case 'Image':
      return getImageName(node, state)

    case 'List':
      return getListBlockName(node, state)

    case 'Text':
      if (node.isAnimated) {
        state.animated.add('Text')
        return 'AnimatedText'
      } else {
        return 'Text'
      }

    default:
      return node.name
  }
}

const getGroupBlockName = (node, state) => {
  let name = 'View'

  if (node.isFragment) {
    name = 'React.Fragment'
  } else if (hasProp(node, 'teleportTo')) {
    node.teleport = true
  } else if (hasProp(node, 'goTo')) {
    node.goTo = true
  } else if (hasProp(node, 'onClick')) {
    const propNode = getProp(node, 'onClick')
    node.action = propNode.value
  }

  if (hasProp(node, 'backgroundImage')) {
    const propNode = getProp(node, 'backgroundImage')
    node.backgroundImage = isSlot(propNode)
      ? propNode.value
      : JSON.stringify(propNode.value)

    name = 'Image'
  } else if (hasProp(node, 'overflowY', v => v === 'auto' || v === 'scroll')) {
    name = 'ScrollView'
  }

  if (node.isAnimated && name !== 'Link') {
    state.animated.add(name)
    name = `Animated${name}`
  }

  return name
}

const getListBlockName = (node, state) => {
  const base = hasProp(node, /^overflow/, v => v === 'auto' || v === 'scroll')
    ? 'FlatList'
    : 'View'
  if (node.isAnimated) {
    state.animated.add(base)
    return `Animated${base}`
  } else {
    return base
  }
}

const isSvg = str => /\.svg$/.test(str)
const getImageName = (node, state) => {
  if (hasProp(node, 'source')) {
    const source = getProp(node, 'source')
    const { value } = source.value

    if (isSvg(value)) {
      const name = `${toPascalCase(value)}Inline`
      node.isSvg = true

      if (!state.svgs.some(svg => svg.source === value)) {
        state.svgs.push({
          source: value,
          view: name,
        })
      }
      return name
    }
  }

  return 'Image'
}
