/* cr.js | MIT License | https://github.com/holgerdell/color-refinement */

/** Given an object and the total number of objects, returns a color
  * @param {Number} obj is the current object (between 0 and numObjects-1)
  * @param {Number} numObjects is the total number of colors needed
  * @param {Number} round is the current round (between 0 and numRounds-1)
  * @param {Number} numRounds is the total number of color refinement rounds
  *
  * @return {String} an RGB string, such as #ef1d99
  */
export default function color (obj, numObjects, round, numRounds) {
  let fraction = 0
  if (obj < 0 || obj > numObjects - 1) return undefined
  if (numObjects > 1) fraction = obj / (numObjects - 1)

  /* Alternative color schemes:
  return d3.interpolateSpectral(fraction);
  return d3.interpolateViridis(fraction);
  return d3.interpolateWarm(fraction);
  return d3.interpolateCool(fraction);
  */

  fraction = 1.75 * (1 - fraction)
  if (fraction <= 1) return d3.color(d3.interpolateWarm(fraction)).darker(0.2)
  else return d3.color(d3.interpolateCool(2 - fraction)).darker(0.2)
}
