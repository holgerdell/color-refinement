/* cr.js | MIT License | https://github.com/holgerdell/color-refinement */

/** Sample a random graph G(n,m)
 * @param {Number} n vertices
 * @param {Number} m edges
 * @return {Graph}
 */
export function randomGraph(n, m, seed) {
  const maxNumEdges = (n * (n - 1)) / 2
  if (n < 0 || m < 0 || m > maxNumEdges) return undefined

  const graph = { vertices: [], edges: [] }
  for (let i = 0; i < n; i++) {
    graph.vertices[i] = { name: i, neighbors: [], crtree: [] }
  }

  const random = Math.seedrandom ? new Math.seedrandom(seed) : Math.random
  const randomInt = (min, max) => Math.floor(random() * (max - min) + min)

  /** Generate a list of random integers using sparse Fisher-Yates shuffling */
  const state = {}
  for (let i = 0; i < m; i++) {
    const j = randomInt(i, maxNumEdges)
    if (!(i in state)) state[i] = i
    if (!(j in state)) state[j] = j
    ;[state[i], state[j]] = [state[j], state[i]]
  }

  /** Cantor's unpairing function
   * @param {Number} k non-negative integer
   * @return {NumberPair} returns the k-th non-negative integer pair (x,y)
   * in the sequence (0,0), (0,1), (1,0), (0,2), (1,1), (2,0), (0,3)...
   */
  function unpair(k) {
    const z = Math.floor((-1 + Math.sqrt(1 + 8 * k)) / 2)
    return [k - (z * (1 + z)) / 2, (z * (3 + z)) / 2 - k]
  }

  for (let i = 0; i < m; i++) {
    const [x, y] = unpair(state[i])
    const u = graph.vertices[x]
    const v = graph.vertices[n - 1 - y]
    graph.edges.push({ source: u, target: v })
    u.neighbors.push(v)
    v.neighbors.push(u)
  }
  return graph
}

/** Compare two trees
 * @param {Tree} T1 is the first tree
 * @param {Tree} T2 is the second tree
 * @return {Number} negative if T1 < T2; positive if T1 > T2; zero if T1 = T2
 *
 * Trees T are objects with at least the following properties:
 * T.children is a (recursively) sorted list of trees
 * T.size is the number of nodes in the tree
 */
function compareTrees(T1, T2) {
  if (T1 === T2) {
    return 0
  } else if (T1.children.length !== T2.children.length) {
    return T1.children.length - T2.children.length
  } else if (T1.size !== T2.size) {
    return T1.size - T2.size
  } else {
    for (let i = 0; i < T1.children.length; i++) {
      const res = compareTrees(T1.children[i], T2.children[i])
      if (res !== 0) return res
    }
    console.error("several refs to same tree were found, this is not intended.")
  }
}

/** Find an isomorphic copy of tree in treelist
 * @param {TreeList} treelist is a list of tree objects
 * @param {TreeList} T represents a tree T as list of children subtrees
 *   and is assumed to be sorted
 * @return {Number} returns i if treelist[i] is the tree T; otherwise -1
 */
function findTree(treelist, T) {
  for (let i = 0; i < treelist.length; i++) {
    if (treelist[i].children.length === T.length) {
      let couldbe = true
      for (let j = 0; j < T.length; j++) {
        if (treelist[i].children[j] !== T[j]) {
          couldbe = false
          break
        }
      }
      if (couldbe) return i
    }
  }
  return -1
}

/** Compute a color refinement round at a node
 *
 * @param {Node} v is a node
 * @param {Number} depth is the new depth; assumes that depth-1 trees have been
 *   computed for all neighbors of v
 * @param {TreeList} treelist is a list of all trees that have already been
 *   observed in this round
 */
function refineAtNode(v, depth, treelist) {
  const neighbors = []
  if (depth > 0) {
    for (let i = 0; i < v.neighbors.length; i++) {
      neighbors.push(v.neighbors[i].crtree[depth - 1])
    }
    neighbors.sort(compareTrees)
  }

  let T
  const index = findTree(treelist, neighbors)
  if (index >= 0) T = treelist[index]
  else {
    T = {
      rank: undefined,
      size: 1,
      children: neighbors,
      class: [], // list of vertices with this color
    }
    for (let i = 0; i < neighbors.length; i++) T.size += neighbors[i].size
    treelist.push(T)
  }
  T.class.push(v)
  v.crtree.push(T)
}

/** Run the color refinement algorithm on a graph
 * @param {Graph} graph
 * @return {TreeList} a list trees, such that trees[i]
 * is a sorted list of all cr-trees that occur in round i; each tree T has a
 * property T.rank representing its order in round i.
 */
export function colorRefinement(graph) {
  const trees = []
  let prevNumColors = 0
  for (let round = 0; ; round++) {
    trees[round] = []
    for (let i = 0; i < graph.vertices.length; i++) {
      refineAtNode(graph.vertices[i], round, trees[round])
    }

    trees[round].sort(compareTrees)
    for (let i = 0; i < trees[round].length; i++) {
      trees[round][i].rank = i
    }

    const numColors = trees[round].length
    if (prevNumColors === numColors) {
      trees.pop() // remove last round (since no further refinement occurred)
      return trees
    } else {
      prevNumColors = numColors
    }
  }
}
