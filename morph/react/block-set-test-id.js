export let enter = (node, parent, state) => {
  let blockName = node.is || node.name

  if (typeof state.testIds[blockName] === 'number') {
    state.testIds[blockName]++
    blockName = `${blockName}:${state.testIds[blockName]}`
  } else {
    state.testIds[blockName] = 0
  }

  node.testId = blockName
}
