import safe from './react/safe.js'
import wrap from './react/wrap.js'

const safeScope = value =>
  typeof value === 'string' && !isCode(value) ? JSON.stringify(value) : value

export const asScopedValue = (obj, node, properties) => {
  const defaultValue = node.inScope ? null : node.value.value
  let value = []

  for (const scope in obj) {
    const scopeProp = properties.list.find(
      prop => prop.inScope === scope && prop.key.valueRaw === node.key.valueRaw
    )
    value.push(`${scope}? ${safeScope(scopeProp.value.value)}`)
  }

  return `${value.join(' : ')} : ${safeScope(defaultValue)}`
}

export const checkParentStem = (node, styleKey) => {
  if (styleKey !== 'hover' || !node.parent) return false

  const matchingParentStem =
    node.parent.properties &&
    node.parent.properties.list.some(prop => prop.tags.hover)

  return matchingParentStem && (node.parent.is || node.parent.name.value)
}

const INTERPOLATION = /\${(.+)}/
export const isInterpolation = str => INTERPOLATION.test(str)
export const deinterpolate = str => {
  const match = str.match(INTERPOLATION)
  return match ? match[1] : str
}

export const getObjectAsString = obj =>
  wrap(
    Object.keys(obj)
      .map(k => {
        const v =
          typeof obj[k] === 'object' && hasKeys(obj[k])
            ? getObjectAsString(obj[k])
            : obj[k]
        return `${JSON.stringify(k)}: ${v}`
      })
      .join(',')
  )

export const getPropertiesAsObject = list => {
  const obj = {}

  list.forEach(prop => {
    obj[prop.key.value] = safeScope(prop.value.value)
  })

  return getObjectAsString(obj)
}

export const getProp = (node, key) => {
  const finder =
    typeof key === 'string'
      ? p => p.key.value === key
      : p => key.test(p.key.value)

  return node.properties && node.properties.list.find(finder)
}

export const getScope = node => node.value.value.split('when ')[1]

const maybeSafe = node =>
  node.tags.code
    ? node.value.value
    : typeof node.value.value === 'string'
      ? safe(node.value.value)
      : node.value.value

export const getScopedProps = (propNode, blockNode) => {
  const scopedProps = blockNode.properties.list
    .filter(prop => prop.key.value === propNode.key.value && prop.inScope)
    .reverse()

  let scopedConditional = maybeSafe(propNode)

  scopedProps.forEach(prop => {
    scopedConditional =
      `${prop.inScope} ? ${maybeSafe(prop)} : ` + scopedConditional
  })

  return scopedConditional
}

const styleStems = ['hover', 'focus', 'placeholder', 'disabled', 'print']
export const getStyleType = node =>
  styleStems.find(tag => isTag(node, tag)) || 'base'
export const hasKeys = obj => Object.keys(obj).length > 0
export const hasKeysInChildren = obj =>
  Object.keys(obj).some(k => hasKeys(obj[k]))

export const hasProp = (node, key, match) => {
  const prop = getProp(node, key)
  if (!prop) return false
  return typeof match === 'function' ? match(prop.value.value) : true
}

export const hasDefaultProp = (node, parent) =>
  parent.list.some(
    prop => prop.key.valueRaw === node.key.valueRaw && !prop.inScope
  )

export const CODE_EXPLICIT = /^{.+}$/
export const isCodeExplicit = str => CODE_EXPLICIT.test(str)
export const isCode = node =>
  typeof node === 'string'
    ? /props|item|index/.test(node) || isCodeExplicit(node)
    : isTag(node, 'code')
export const isStyle = node => isTag(node, 'style')
export const isTag = (node, tag) => node.tags[tag]

export const getActionableParent = node => {
  if (!node.parent) return false
  if (node.parent.action) return node.parent
  return getActionableParent(node.parent)
}

export const getAllowedStyleKeys = node => {
  if (node.isCapture) {
    return ['base', 'focus', 'hover', 'disabled', 'placeholder']
  } else if (node.action || getActionableParent(node)) {
    return ['base', 'focus', 'hover', 'disabled']
  }
  return ['base', 'focus']
}

export const isList = node =>
  node.type === 'Block' && node.name.value === 'List'
