/* cr.js | MIT License | github.com/holgerdell/color-refinement */
import { getState, updateState, getStateChanges } from './state.js'
import color from './color.js'
import * as cr from './cr.js'

let simulation
let treesPerRound
let hoveringNode
let draggingNode
let hoveringTreeRound

/** Highlight nodes, links, and tree on a mouseover event
  * @param {Number} i is the color to be highlighted
  * @param {Number} round is the round that the color i refers to
  */
function highlightColor (i, round) {
  d3.selectAll('circle.graphNode').attr('class', o => o.crtree[round].rank === i ? 'graphNode highlight' : 'graphNode nonhighlight')
  d3.selectAll('line.graphEdge').attr('class', o => (o.source.crtree[round].rank === i &&
     o.target.crtree[round].rank === i) ? 'graphEdge highlight' : 'graphEdge nonhighlight')
  d3.selectAll('#crtrees svg').classed('nonhighlight', true)
  d3.select('#crtree' + i).classed('nonhighlight', false).classed('highlight', true)
}

/** Reset all highlights (e.g. when the mouseover event is over) */
function resetHighlightColor () {
  d3.selectAll('#crtrees svg').classed('highlight', false).classed('nonhighlight', false)
  d3.selectAll('circle.graphNode').classed('highlight', false).classed('nonhighlight', false)
  d3.selectAll('line.graphEdge').classed('highlight', false).classed('nonhighlight', false)
}

/** Pulse all nodes of a given color (e.g., when a tree has been clicked)
  * @param {Number} i is the color that should be pulsed
  * @param {Number} round is the round that the color i refers to
  * @return {Function} is a function that, when called, performs the pulse
  */
function pulser (i, round) {
  return function () {
    d3.selectAll('circle.graphNode')
      .transition()
      .duration(100)
      .attr('r', v => radius(v) + (v.crtree[round].rank === i ? 8 : 0))
      .transition()
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
async function drawTrees (state, trees) {
  if (!state.crtrees) return

  const d3treeMaker = d3.tree().size([2 * Math.PI, 30])
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)

  const crtrees = d3.select('#crtrees')
  crtrees.selectAll('div').remove()
  crtrees.classed('loading', true)
  for (let i = 0; i < trees.length; i++) {
    const root = d3.hierarchy(trees[i])
    root.sort()
    const d3tree = d3treeMaker(root)

    root.each((v) => {
      [v.x, v.y] = radialPoint(v.x, v.y);
      [v.x, v.y] = [v.x + 46, v.y + 46]
    })

    const div = d3.create('div')
    const svg = div.append('svg').attr('id', 'crtree' + i)
      .style('background-color',
        color(i, trees.length, state.round, treesPerRound.length))

    div.append('div').classed('count', true).text(trees[i].class.length)

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

    div.on('mouseover', () => { hoveringTreeRound = state.round; highlightColor(i, state.round) })
    div.on('mouseout', () => { hoveringTreeRound = undefined; resetHighlightColor() })
    div.on('click', pulser(i, state.round))
    crtrees.insert(() => div.node(), 'div.loading-animation')
  }
  crtrees.classed('loading', false)
}

/** Compute radius of a node.
  * @param {Node} v
  * @return {Number} the radius of the node scales with its degree
  */
function radius (v) {
  return 5 * Math.sqrt(v.neighbors.length) + 4
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
async function reload (forceResample = false) {
  const svg = d3.select('main > svg')
  const state = getState()
  const changedFields = getStateChanges(state)
  if (forceResample || changedFields === undefined || changedFields.has('n') || changedFields.has('m') || changedFields.has('seed')) {
    hoveringNode = undefined
    draggingNode = undefined
    resetHighlightColor()
    svg.selectAll('*').remove()
    d3.select('main').classed('loading', true)
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

    svg.selectAll('line.graphEdge')
      .data(graph.edges).enter().append('line')
      .attr('class', 'graphEdge')

    svg.selectAll('circle.graphNode')
      .data(graph.vertices).enter().append('circle')
      .attr('class', 'graphNode')
      .attr('r', 10).attr('cx', w / 2).attr('cy', h / 2)
      .call(d3.drag()
        .on('start', (v) => {
          draggingNode = v
          if (!d3.event.active) simulation.alphaTarget(0.3).restart();
          [v.fx, v.fy] = [v.x, v.y]
        })
        .on('drag', (v) => {
          [v.fx, v.fy] = [d3.event.x, d3.event.y]
        })
        .on('end', (v) => {
          draggingNode = undefined
          if (!d3.event.active) simulation.alphaTarget(0);
          [v.fx, v.fy] = [null, null]
        }))
      .on('mouseover', (v) => {
        hoveringNode = v
        const round = getState().round
        if (draggingNode === undefined) highlightColor(v.crtree[round].rank, round)
      })
      .on('mouseout', () => {
        hoveringNode = undefined
        if (draggingNode === undefined) resetHighlightColor()
      })

    recenter()
    d3.select('main').classed('loading', false)
    state.round = Math.min(state.round, treesPerRound.length - 1)
    updateState(state, true)
    changedFields.add('round')
  } else {
    if (changedFields.has('charge')) {
      simulation.force('charge', d3.forceManyBody().strength(state.charge))
        .alpha(0.5).restart()
    }
  }
  if (changedFields !== undefined && changedFields.size !== 0) {
    drawNavElements(state)
  }
  if (changedFields.has('round')) {
    if (hoveringTreeRound) {
      hoveringTreeRound = undefined
      resetHighlightColor()
    }

    drawTrees(state, treesPerRound[state.round])
    changedFields.add('count')

    if (draggingNode || hoveringNode) {
      const activeNode = draggingNode || hoveringNode
      highlightColor(activeNode.crtree[state.round].rank, state.round)
    }

    changedFields.add('count')

    /* Pulse effect */
    simulation.alpha(1).restart()
    svg.selectAll('circle.graphNode')
      .transition().duration(200).attr('r', v => radius(v) + 2)
      .transition().duration(200).attr('r', radius)
  }
  if (changedFields.has('count')) {
    if (state.count) {
      d3.selectAll('div.count').style('display', 'block')
    } else {
      d3.selectAll('div.count').style('display', 'none')
    }
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
const toggle = field => { const state = getState(); state[field] = !state[field]; updateState(state) }

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
    else if (['c'].includes(event.key)) toggle('count')
  }
}

function drawNavElements (state) {
  document.getElementById('nav').style.display = (state.navbar) ? 'flex' : 'none'
  document.getElementById('crtrees').style.display = (state.crtrees) ? 'grid' : 'none'

  document.getElementById('n').innerText = state.n
  document.getElementById('m').innerText = state.m
  document.getElementById('charge').innerText = state.charge
  document.getElementById('displayRound').innerText = state.round
}

/** The main function is called when the page has loaded */
function main () {
  simulation = d3.forceSimulation().on('tick', () => {
    d3.selectAll('line.graphEdge')
      .attr('x1', e => e.source.x)
      .attr('y1', e => e.source.y)
      .attr('x2', e => e.target.x)
      .attr('y2', e => e.target.y)
    d3.selectAll('circle.graphNode')
      .attr('cx', v => v.x)
      .attr('cy', v => v.y)
      .attr('fill', v => {
        const round = getState().round
        return color(v.crtree[round].rank, treesPerRound[round].length, round, treesPerRound.length)
      })
  })

  document.getElementById('up').addEventListener('click', () => increase('charge'))
  document.getElementById('down').addEventListener('click', () => decrease('charge'))
  document.getElementById('right').addEventListener('click', () => increase('round'))
  document.getElementById('left').addEventListener('click', () => decrease('round'))
  document.getElementById('reload').addEventListener('click', () => reload(true))
  document.getElementById('count').addEventListener('click', () => toggle('count'))
  document.addEventListener('keydown', shortcuts)
  document.getElementById('main').addEventListener('wheel', event => (event.deltaY < 0) ? increase('charge') : decrease('charge'))
  window.addEventListener('hashchange', () => reload())
  window.onresize = recenter
  reload()
}

window.onload = main
