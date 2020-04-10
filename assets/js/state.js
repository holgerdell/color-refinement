import * as defaults from './defaults.js'

export const getState = () => {
  const urlParams = {}
  let match
  const pl = /\+/g
  const search = /([^&=]+)=?([^&]*)/g
  const decode = (s) => decodeURIComponent(s.replace(pl, ' '))
  const hash = decodeURIComponent(window.location.hash.substr(1))

  if (hash !== undefined) {
    while ((match = search.exec(hash)) !== null) {
      urlParams[decode(match[1])] = decode(match[2])
    }
  }

  const state = {}
  for (const k of Object.keys(defaults.state)) {
    if (urlParams[k] === undefined) {
      state[k] = defaults.state[k]
    } else {
      switch (typeof defaults.state[k]) {
        case 'number':
          state[k] = parseInt(urlParams[k], 10)
          break
        case 'boolean':
          state[k] = !(urlParams[k] === 'false')
          break
      }
    }
  }
  return state
}

/* This keeps track of the fields that were changed since the last time getStateChanges() was called */
const oldState = {}
export const getStateChanges = (state = getState()) => {
  const fs = new Set()
  for (const k of Object.keys(state)) {
    if (oldState[k] === undefined || oldState[k] !== state[k]) {
      fs.add(k)
    }
    oldState[k] = state[k]
  }
  return fs
}

export const updateState = (state) => {
  let hash = '#'
  for (const k of Object.keys(state)) {
    if (state[k] !== defaults.state[k]) {
      hash += k + '='
      switch (typeof state[k]) {
        case 'number':
          hash += state[k].toString()
          break
        case 'boolean':
          hash += state[k].toString()
          break
        default:
          console.error(`${typeof state[k]} not recognized`)
      }
      hash += '&'
    }
  }
  hash = hash.substring(0, hash.length - 1)
  window.location.hash = hash
}
