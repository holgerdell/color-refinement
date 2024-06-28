/* cr.js | MIT License | https://github.com/holgerdell/color-refinement */

import * as defaults from "./defaults.js"

const parse = (x, t) => {
  switch (t) {
    case "number":
      return parseInt(x, 10)
    case "boolean":
      return !(x === "false")
    case "string":
      return x
    default:
      console.error(`${t} not recognized`)
  }
}

export const getState = () => {
  const urlParams = {}
  let match
  const pl = /\+/g
  const search = /([^&=]+)=?([^&]*)/g
  const decode = (s) => decodeURIComponent(s.replace(pl, " "))
  const hash = decodeURIComponent(window.location.hash.substr(1))

  if (hash !== undefined) {
    while ((match = search.exec(hash)) !== null) {
      urlParams[decode(match[1])] = decode(match[2])
    }
  }

  const state = {}
  for (const k of defaults.keys()) {
    state[k] =
      urlParams[k] === undefined
        ? defaults.get(k)
        : parse(urlParams[k], typeof defaults.get(k))
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

const stringify = (x) => {
  switch (typeof x) {
    case "number":
      return x.toString()
    case "boolean":
      return x.toString()
    case "string":
      return x
    default:
      console.error(`${typeof x} not recognized`)
  }
}

export const updateState = (state, useAsOld = false) => {
  let hash = "#"
  for (const k of defaults.keys()) {
    if (state[k] !== defaults.get(k)) hash += `${k}=${stringify(state[k])}&`
    if (useAsOld) oldState[k] = state[k]
  }
  hash = hash.substring(0, hash.length - 1)
  window.location.hash = hash
}
