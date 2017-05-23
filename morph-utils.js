import { wrap } from './morph-react.js'

export const getObjectAsString = obj =>
  wrap(
    Object.keys(obj)
      .map(k => {
        const v = typeof obj[k] === 'object' && hasKeys(obj[k])
          ? getObjectAsString(obj[k])
          : obj[k]
        return `${JSON.stringify(k)}: ${v}`
      })
      .join(',')
  )

export const hasKeys = obj => Object.keys(obj).length > 0

export const hasProp = (node, key, match) => {
  const finder = typeof key === 'string'
    ? p => p.key.value === key
    : p => key.test(p.key.value)

  const prop = node.properties.list.find(finder)
  if (!prop) return false
  return typeof match === 'function' ? match(prop.value.value) : true
}

export const isCode = node => isTag('code', node)
export const isStyle = node => isTag('style', node)

const isTag = (tag, node) => node.tags.includes(tag)
