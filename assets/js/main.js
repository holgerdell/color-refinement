/* cr.js | MIT License | github.com/holgerdell/color-refinement */
import { getState, updateState, getStateChanges } from './state.js'
import color from './color.js'
import * as cr from './cr.js'

let svgnodes
let svglinks
let simulation
let treesPerRound
let hoveringNode
let highlightedColor = -1

/** Highlight nodes, links, and tree on a mouseover event
  * @param {Number} i is the color to be highlighted
  * @param {Number} round is the round that the color i refers to
  */
function highlightColor (i, round) {
  highlightedColor = i
  svgnodes.attr('class', o => o.crtree[round].rank === highlightedColor ? 'highlight' : 'nonhighlight')
  svglinks.attr('class', o => (o.source.crtree[round].rank === highlightedColor &&
     o.target.crtree[round].rank === highlightedColor) ? 'highlight' : 'nonhighlight')
  d3.selectAll('#crtrees > svg').attr('class', 'nonhighlight')
  d3.select('#crtree' + highlightedColor).attr('class', 'highlight')
}

/** Reset all highlights (e.g. when the mouseover event is over) */
function resetHighlightColor () {
  if (highlightedColor >= 0) {
    d3.selectAll('#crtrees > svg').attr('class', '')
  }
  svgnodes.attr('class', '')
  svglinks.attr('class', '')
  highlightedColor = -1
  hoveringNode = undefined
}

/** Pulse all nodes of a given color (e.g., when a tree has been clicked)
  * @param {Number} i is the color that should be pulsed
  * @param {Number} round is the round that the color i refers to
  * @return {Function} is a function that, when called, performs the pulse
  */
function pulser (i, round) {
  return function () {
    svgnodes.transition()
      .duration(100)
      .attr('r', v => radius(v) + (v.crtree[round].rank === i ? 8 : 0))
    svgnodes.transition()
      .delay(100)
      .duration(200)
      .attr('r', radius)
  }
}

/** Radial to Cartesian coordinates
  * @param {Number} x
  * @param {Number} y
  * @return {NumberPair} [x', y']
  */
function radialPoint (x, y) {
  return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)]
}

/** Draw the CR trees
  * @param {Dictionary} state the current program state
  * @param {TreeList} trees a list of tree objects
  */
function drawTrees (state, trees) {
  if (!state.crtrees) return

  const d3treeMaker = d3.tree().size([2 * Math.PI, 30])
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)

  const crtrees = d3.select('#crtrees')
  crtrees.selectAll('svg').remove()
  for (let i = 0; i < trees.length; i++) {
    const root = d3.hierarchy(trees[i])
    root.sort()
    const d3tree = d3treeMaker(root)

    root.each((v) => {
      [v.x, v.y] = radialPoint(v.x, v.y);
      [v.x, v.y] = [v.x + 46, v.y + 46]
    })

    const svg = d3.create('svg').attr('id', 'crtree' + i)
      .style('background-color',
        color(i, trees.length, state.round, treesPerRound.length))

    svg.selectAll('line.treeEdge')
      .data(d3tree.links())
      .enter().append('line').classed('treeEdge', true)
      .attr('x1', e => e.source.x)
      .attr('y1', e => e.source.y)
      .attr('x2', e => e.target.x)
      .attr('y2', e => e.target.y)

    svg.selectAll('circle.treeNode')
      .data(root.descendants())
      .enter().append('circle').classed('treeNode', true)
      .classed('rootNode', v => v.parent === null)
      .attr('r', v => v.parent === null ? 5 : 2.5)
      .attr('cx', v => v.x)
      .attr('cy', v => v.y)

    svg.on('mouseover', () => highlightColor(i, state.round))
    svg.on('mouseout', resetHighlightColor)
    svg.on('click', pulser(i, state.round))
    crtrees.append(() => svg.node())
  }
}

/** Compute radius of a node.
  * @param {Node} v
  * @return {Number} the radius of the node scales with its degree
  */
function radius (v) {
  return 5 * Math.sqrt(v.neighbors.length) + 4
}

/** Draw a given round.
 *  @param {Dictionary} state the current program state
  * @param {Number} round
  */
function drawRound (state) {
  document.getElementById('displayRound').innerText = state.round
  svgnodes.style('fill', v => color(v.crtree[state.round].rank,
    treesPerRound[state.round].length, state.round, treesPerRound.length))

  drawTrees(state, treesPerRound[state.round])

  if (hoveringNode) {
    highlightColor(hoveringNode.crtree[state.round].rank, state.round)
  }

  /* Pulse effect */
  simulation.alpha(1).restart()
  svgnodes.transition().duration(200)
    .attr('r', v => radius(v) + 2)
  svgnodes.transition().delay(200).duration(200)
    .attr('r', radius)
}

/** Recenter the simulation (e.g. after window resize event) */
function recenter () {
  const w = document.getElementById('main').offsetWidth
  const h = document.getElementById('main').offsetHeight
  simulation
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('xAxis', d3.forceX(w / 2).strength(0.1))
    .force('yAxis', d3.forceY(h / 2).strength(0.1))
    .alpha(1).restart()
}

/** Sample and draw new graph
  * Also draws CR trees, sets up mouseover events, and starts the simulation
  */
function reload (forceResample = false) {
  const state = getState()
  const changedFields = getStateChanges(state)
  if (forceResample || changedFields === undefined || changedFields.has('n') || changedFields.has('m') || changedFields.has('seed')) {
    if (svgnodes) {
      resetHighlightColor()
      svglinks.remove()
      svgnodes.remove()
    }
    const w = document.getElementById('main').offsetWidth
    const h = document.getElementById('main').offsetHeight

    if (Math.seedrandom && (state.seed === '' || forceResample)) {
      state.seed = Math.random().toString(36).substr(2, 5)
    }
    const graph = cr.randomGraph(state.n, state.m, state.seed)
    treesPerRound = cr.colorRefinement(graph)
    document.getElementById('numRounds').innerText = treesPerRound.length - 1

    simulation
      .nodes(graph.vertices)
      .force('charge', d3.forceManyBody().strength(state.charge))
      .force('link', d3.forceLink(graph.edges).distance(50).strength(0.9))

    const svg = d3.select('main > svg')
    svglinks = svg.selectAll('line.graphEdge')
      .data(graph.edges).enter().append('line')
      .attr('class', 'graphEdge')
    svgnodes = svg.selectAll('circle.graphNode')
      .data(graph.vertices).enter().append('circle')
      .attr('class', 'graphNode')
      .attr('r', 10).attr('cx', w / 2).attr('cy', h / 2)
      .call(d3.drag()
        .on('start', (v) => {
          if (!d3.event.active) simulation.alphaTarget(0.3).restart();
          [v.fx, v.fy] = [v.x, v.y]
        })
        .on('drag', (v) => {
          [v.fx, v.fy] = [d3.event.x, d3.event.y]
        })
        .on('end', (v) => {
          if (!d3.event.active) simulation.alphaTarget(0);
          [v.fx, v.fy] = [null, null]
        }))
      .on('mouseover', (v) => {
        hoveringNode = v
        const round = getState().round
        highlightColor(v.crtree[round].rank, round)
      })
      .on('mouseout', resetHighlightColor)

    recenter()
    state.round = Math.min(state.round, treesPerRound.length - 1)
    drawTrees(state, treesPerRound[state.round])
    updateState(state)
    drawRound(state)
  } else {
    if (changedFields.has('charge')) {
      simulation.force('charge', d3.forceManyBody().strength(state.charge))
        .alpha(0.5).restart()
    }
    if (changedFields.has('round')) {
      drawRound(state)
    }
  }
  if (changedFields !== undefined && changedFields.size !== 0) {
    drawNavElements(state)
  }
}

function addto (field, stepsize, min, max) {
  const state = getState()
  const newval = state[field] + stepsize
  if (min !== undefined && newval < min) state[field] = min
  else if (max !== undefined && newval > max) state[field] = max
  else state[field] = newval
  updateState(state)
}

const STEPSIZE = {
  round: 1,
  n: 5,
  m: 5,
  charge: -50
}

const getMin = field => (field === 'charge') ? -Infinity : 0
const getMax = field => (field === 'round') ? treesPerRound.length - 1
  : (field === 'charge') ? 0 : Infinity
const increase = field => addto(field, STEPSIZE[field], getMin(field), getMax(field))
const decrease = field => addto(field, -STEPSIZE[field], getMin(field), getMax(field))

function shortcuts (event) {
  if (!event.ctrlKey && !event.altKey) {
    if (['ArrowLeft', 'h', 'Backspace'].includes(event.key)) decrease('round')
    else if (['ArrowRight', 'l', ' '].includes(event.key)) increase('round')
    else if (['r'].includes(event.key)) reload(true)
    else if (['ArrowUp', 'k'].includes(event.key)) increase('charge')
    else if (['ArrowDown', 'j'].includes(event.key)) decrease('charge')
    else if (['+', 'M'].includes(event.key)) increase('m')
    else if (['-', 'm'].includes(event.key)) decrease('m')
    else if (['N'].includes(event.key)) increase('n')
    else if (['n'].includes(event.key)) decrease('n')
  }
}

function drawNavElements (state) {
  document.getElementById('nav').style.display = (state.navbar) ? 'flex' : 'none'
  document.getElementById('crtrees').style.display = (state.crtrees) ? 'grid' : 'none'

  document.getElementById('n').innerText = state.n
  document.getElementById('m').innerText = state.m
  document.getElementById('charge').innerText = state.charge
}

/** The main function is called when the page has loaded */
function main () {
  simulation = d3.forceSimulation().on('tick', () => {
    svglinks
      .attr('x1', e => e.source.x)
      .attr('y1', e => e.source.y)
      .attr('x2', e => e.target.x)
      .attr('y2', e => e.target.y)
    svgnodes
      .attr('cx', v => v.x)
      .attr('cy', v => v.y)
  })

  document.getElementById('up').addEventListener('click', () => increase('charge'))
  document.getElementById('down').addEventListener('click', () => decrease('charge'))
  document.getElementById('right').addEventListener('click', () => increase('round'))
  document.getElementById('left').addEventListener('click', () => decrease('round'))
  document.getElementById('reload').addEventListener('click', () => reload(true))
  document.addEventListener('keydown', shortcuts)
  window.addEventListener('hashchange', () => reload())
  window.onresize = recenter
  reload()
}

window.onload = main
