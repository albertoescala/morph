import { promises as fs } from 'fs'
import path from 'path'

let makeUseIsMedia = ({
  mobile,
  tablet,
  laptop,
}) => `// This file is automatically generated by Views and will be overwritten
// when the morpher runs. If you want to contribute to how it's generated, eg,
// improving the algorithms inside, etc, see this:
// https://github.com/viewstools/morph/blob/master/ensure-is-media.js

import { useMedia } from 'use-media';

let useIsMedia = () => {
  let mobile = useMedia({ minWidth: 0, maxWidth: ${mobile.width} })
  let tablet = useMedia({ minWidth: ${mobile.width + 1}, maxWidth: ${
  tablet.width
} })
  let laptop = useMedia({ minWidth: ${tablet.width + 1}, maxWidth: ${
  laptop.width
} })
  let desktop = useMedia({ minWidth: ${laptop.width + 1} })

  return {
    mobile,
    tablet,
    laptop,
    desktop,
  }
}
export default useIsMedia`

let getMediaConfig = async src => {
  try {
    return JSON.parse(
      await fs.readFile(path.join(src, 'app.viewstools'), 'utf8')
    ).media
  } catch (error) {
    return {
      mobile: {
        width: 375,
      },
      tablet: {
        width: 1024,
      },
      laptop: {
        width: 1280,
      },
    }
  }
}

export default async function ensureIsMedia({ src }) {
  return fs.writeFile(
    path.join(src, 'useIsMedia.js'),
    makeUseIsMedia(await getMediaConfig(src)),
    {
      encoding: 'utf8',
    }
  )
}
