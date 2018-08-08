/* cr.js | MIT License | github.com/holgerdell/color-refinement */

/** These default values can be overwritten by URL parameters, such as
  * index.html?n=70&m=90&charge=-300&nohelp&notrees */
let n = 50;
let m = 35;
let charge;
if (document.getElementById("main").offsetWidth < 700) charge = -100;
else charge = -200;

let drawCRtrees = true;

/* eslint-disable no-unused-vars */
/** Computes the RGB color from the node's color
  * @param {Number} color is the current color (between 0 and numColors-1)
  * @param {Number} numColors is the total number of colors in the current round
  * @param {Number} round is the current round (between 0 and numRounds-1)
  * @param {Number} numRounds is the total number of color refinement rounds
  *
  * @return {String} an RGB string, such as #ef1d99
  */
function colorToRGB(color, numColors, round, numRounds) {
  let fraction = 0;
  if (numColors > 1) fraction = color / (numColors - 1);

  /* Alternative color schemes:
  return d3.interpolateSpectral(fraction);
  return d3.interpolateViridis(fraction);
  return d3.interpolateWarm(fraction);
  return d3.interpolateCool(fraction);
  */

  fraction = 1.75 * (1-fraction);
  if (fraction <= 1) return d3.color(d3.interpolateWarm(fraction)).darker(0.2);
  if (fraction > 1) return d3.color(d3.interpolateCool(2-fraction)).darker(0.2);
}
/* eslint-enable no-unused-vars */

/** Sample a random graph G(n,m)
  * @param {Number} n vertices
  * @param {Number} m edges
  * @return {Graph}
  */
function randomGraph(n, m) {
  let maxNumEdges = n * (n-1) / 2;
  if (n < 0 || m < 0 || m > maxNumEdges) return undefined;

  let graph = {vertices: [], edges: []};
  for (let i = 0; i < n; i++) {
    graph.vertices[i] = {name: i, neighbors: [], crtree: []};
  }

  const randomInt = (min, max) => Math.floor(Math.random()*(max-min)+min);
  /** Generate a list of random integers using sparse Fisher-Yates shuffling */
  let state = {};
  for (let i=0; i<m; i++) {
    let j = randomInt(i, maxNumEdges);
    if (!(i in state)) state[i] = i;
    if (!(j in state)) state[j] = j;
    [state[i], state[j]] = [state[j], state[i]];
  }

  /** Cantor's unpairing function
    * @param {Number} k non-negative integer
    * @return {NumberPair} returns the k-th non-negative integer pair (x,y)
    * in the sequence (0,0), (0,1), (1,0), (0,2), (1,1), (2,0), (0,3)...
    */
  function unpair(k) {
    let z = Math.floor((-1 + Math.sqrt(1+8*k)) / 2);
    return [k - z * (1+z) / 2, z * (3+z) / 2 - k];
  }

  for (let i=0; i<m; i++) {
    let [x, y] = unpair(state[i]);
    let u = graph.vertices[x];
    let v = graph.vertices[n-1-y];
    graph.edges.push({source: u, target: v});
    u.neighbors.push(v);
    v.neighbors.push(u);
  }
  return graph;
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
  if (T1 == T2) {
    return 0;
  } else if (T1.children.length != T2.children.length) {
    return T1.children.length - T2.children.length;
  } else if (T1.size != T2.size) {
    return T1.size - T2.size;
  } else {
    for (let i=0; i < T1.children.length; i++) {
      let res = compareTrees(T1.children[i], T2.children[i]);
      if (res != 0) return res;
    }
    // (this line should never be reached)
  }
}

/** Find an isomorphic copy of tree in treelist
  * @param {TreeList} treelist is a list of tree objects
  * @param {TreeList} T represents a tree T as list of children subtrees
  *   and is assumed to be sorted
  * @return {Number} returns i if treelist[i] is the tree T; otherwise -1
  */
function findTree(treelist, T) {
  for (let i=0; i<treelist.length; i++) {
    if (treelist[i].children.length == T.length) {
      let couldbe = true;
      for (let j=0; j<T.length; j++) {
        if (treelist[i].children[j] != T[j]) {
          couldbe = false;
          break;
        }
      }
      if (couldbe) return i;
    }
  }
  return -1;
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
  let neighbors = [];
  if (depth>0) {
    for (let i=0; i<v.neighbors.length; i++) {
      neighbors.push(v.neighbors[i].crtree[depth-1]);
    }
    neighbors.sort(compareTrees);
  }

  let T;
  let index = findTree(treelist, neighbors);
  if (index >= 0) T = treelist[index];
  else {
    T = {
      rank: undefined,
      size: 1,
      children: neighbors,
    };
    for (let i=0; i<neighbors.length; i++) T.size += neighbors[i].size;
    treelist.push(T);
  }
  v.crtree.push(T);
}

/** Run the color refinement algorithm on a graph
  * @param {NodeList} nodes represents the graph as a list of vertex objects
  * @return {TreeList} a list trees, such that trees[i]
  * is a sorted list of all cr-trees that occur in round i; each tree T has a
  * property T.rank representing its order in round i.
  */
function colorRefinement(nodes) {
  let trees = [];
  let prevNumColors = 0;
  for (let round=0; round < 99; round++) {
    trees[round] = [];
    for (let i=0; i < nodes.length; i++) {
      refineAtNode(nodes[i], round, trees[round]);
    }

    trees[round].sort(compareTrees);
    for (let i=0; i < trees[round].length; i++) {
      trees[round][i].rank = i;
    }

    let numColors = trees[round].length;
    if (prevNumColors == numColors) return trees;
    else prevNumColors = numColors;
  }
  return trees;
}

let svgnodes;
let svglinks;
let simulation = d3.forceSimulation().on("tick", () => {
  svglinks
    .attr("x1", (e) => e.source.x)
    .attr("y1", (e) => e.source.y)
    .attr("x2", (e) => e.target.x)
    .attr("y2", (e) => e.target.y);
  svgnodes
    .attr("cx", (v) => v.x)
    .attr("cy", (v) => v.y);
});
let treesPerRound;
let displayRound = 0;
let hoveringNode;
let highlightedColor = -1;


/** Highlight nodes, links, and tree on a mouseover event
  * @param {Number} i is the color to be highlighted
  */
function highlightColor(i) {
  highlightedColor = i;
  svgnodes.attr("class", (o) => {
    if (o.crtree[displayRound].rank == highlightedColor) {
      return "highlight";
    } else {
      return "nonhighlight";
    }
  });
  svglinks.attr("class", (o) => {
    if (o.source.crtree[displayRound].rank == highlightedColor
     && o.target.crtree[displayRound].rank == highlightedColor) {
      return "highlight";
    } else {
      return "nonhighlight";
    }
  });
  d3.select("#crtree"+highlightedColor).attr("class", "highlight");
}

/** Reset all highlights (e.g. when the mouseover event is over) */
function resetHighlightColor() {
  if (highlightedColor >= 0) {
    d3.select("#crtree"+highlightedColor).attr("class", "");
  }
  svgnodes.attr("class", () => "");
  svglinks.attr("class", () => "");
  highlightedColor = -1;
  hoveringNode = undefined;
}

/** Pulse all nodes of a given color (e.g., when a tree has been clicked)
  * @param {Number} i is the color that should be pulsed
  * @return {Function} is a function that, when called, performs the pulse
  */
function pulser(i) {
  return function() {
    svgnodes.transition()
      .duration(100)
      .attr("r", (v) => {
        if (v.crtree[displayRound].rank == i) return radius(v) + 8;
        else return radius(v);
      });
    svgnodes.transition()
      .delay(100)
      .duration(200)
      .attr("r", radius);
  };
}


/** Radial to Cartesian coordinates
  * @param {Number} x
  * @param {Number} y
  * @return {NumberPair} [x', y']
  */
function radialPoint(x, y) {
  return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
}

/** Draw the CR trees
  * @param {TreeList} trees a list of tree objects
  */
function drawTrees(trees) {
  if (!drawCRtrees) return;

  let d3treeMaker = d3.tree().size([2 * Math.PI, 30])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

  let crtrees = d3.select("#crtrees");
  crtrees.selectAll("svg").remove();
  for (let i=0; i<trees.length; i++) {
    let root = d3.hierarchy(trees[i]);
    root.sort();
    let d3tree = d3treeMaker(root);

    root.each((v) => {
      [v.x, v.y] = radialPoint(v.x, v.y);
      [v.x, v.y] = [v.x+46, v.y+46];
    });

    let svg = d3.create("svg").attr("id", "crtree"+i)
      .style("background-color",
        colorToRGB(i, trees.length, displayRound, treesPerRound.length));

    svg.selectAll("line.treeEdge")
      .data(d3tree.links()).enter().append("line").attr("class", "treeEdge")
      .attr("x1", (e) => e.source.x)
      .attr("y1", (e) => e.source.y)
      .attr("x2", (e) => e.target.x)
      .attr("y2", (e) => e.target.y);

    svg.selectAll("circle.treeNode")
      .data(root.descendants())
      .enter().append("circle")
      .attr("class", (v) => {
        if (v.parent == null) return "treeNode rootNode";
        else return "treeNode";
      })
      .attr("r", 2.5)
      .attr("cx", (v) => v.x)
      .attr("cy", (v) => v.y);

    svg.on("mouseover", () => highlightColor(i));
    svg.on("mouseout", resetHighlightColor);
    svg.on("click", pulser(i));
    crtrees.append(() => svg.node());
  }
}

/** Compute radius of a node.
  * @param {Node} v
  * @return {Number} the radius of the node scales with its degree
  */
function radius(v) {
  return 5* Math.sqrt(v.neighbors.length) + 4;
}

/** Draw a given round.
  * @param {Number} round
  */
function drawRound(round) {
  document.getElementById("displayRound").innerText = round;
  svgnodes.style("fill", (v) => colorToRGB(v.crtree[round].rank,
    treesPerRound[round].length, round, treesPerRound.length));

  drawTrees(treesPerRound[round]);

  if (hoveringNode) {
    highlightColor(hoveringNode.crtree[round].rank);
  }

  /* Pulse effect */
  simulation.alpha(1).restart();
  svgnodes.transition().duration(200)
    .attr("r", (v) => radius(v) + 2);
  svgnodes.transition().delay(200).duration(200)
    .attr("r", radius);
}

/** Recenter the simulation (e.g. after window resize event) */
function recenter() {
  const w = document.getElementById("main").offsetWidth;
  const h = document.getElementById("main").offsetHeight;
  simulation
    .force("center", d3.forceCenter(w/2, h/2))
    .force("xAxis", d3.forceX(w/2).strength(0.1))
    .force("yAxis", d3.forceY(h/2).strength(0.1))
    .alpha(1).restart();
}

/** Charge has changed; set it in the simulation */
function recharge() {
  document.getElementById("charge").innerText = charge;
  simulation.force("charge", d3.forceManyBody().strength(charge))
    .alpha(1).restart();
}

window.onresize = recenter;

/** Sample and draw new graph
  * Also draws CR trees, sets up mouseover events, and starts the simulation
  */
function reload() {
  if (svglinks && svgnodes) {
    resetHighlightColor();
    svglinks.remove();
    svgnodes.remove();
  }
  const w = document.getElementById("main").offsetWidth;
  const h = document.getElementById("main").offsetHeight;

  let graph = randomGraph(n, m);
  treesPerRound = colorRefinement(graph.vertices);

  if (displayRound >= treesPerRound.length) {
    displayRound = treesPerRound.length - 1;
  }
  document.getElementById("numRounds").innerText = treesPerRound.length - 1;

  simulation
    .nodes(graph.vertices)
    .force("charge", d3.forceManyBody().strength(charge))
    .force("link", d3.forceLink(graph.edges).distance(50).strength(0.9));

  let svg = d3.select("main > svg");
  svglinks = svg.selectAll("line.graphEdge")
    .data(graph.edges).enter().append("line")
    .attr("class", "graphEdge");
  svgnodes = svg.selectAll("circle.graphNode")
    .data(graph.vertices).enter().append("circle")
    .attr("class", "graphNode")
    .attr("r", 10).attr("cx", w/2).attr("cy", h/2)
    .call(d3.drag()
      .on("start", (v) => {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        [v.fx, v.fy] = [v.x, v.y];
      })
      .on("drag", (v) => {
        [v.fx, v.fy] = [d3.event.x, d3.event.y];
      })
      .on("end", (v) => {
        if (!d3.event.active) simulation.alphaTarget(0);
        [v.fx, v.fy] = [null, null];
      }))
    .on("mouseover", (v) => {
      hoveringNode = v;
      highlightColor(v.crtree[displayRound].rank);
    })
    .on("mouseout", resetHighlightColor);

  recenter();
  drawTrees(treesPerRound[displayRound]);
  drawRound(displayRound);
}

/** Map keyboard input to actions
  * @param {String} key
  */
function pressKey(key) {
  switch (key) {
  case "ArrowLeft":
  case "h":
  case "Backspace":
    if (displayRound > 0) {
      displayRound--;
      drawRound(displayRound);
    }
    break;

  case "ArrowRight":
  case "l":
  case " ":
    if (displayRound < treesPerRound.length - 1) {
      displayRound++;
      drawRound(displayRound);
    }
    break;

  case "r":
    reload();
    break;

  case "ArrowUp":
  case "k":
    charge -= 50;
    recharge();
    break;

  case "ArrowDown":
  case "j":
    if (charge < -50) charge += 50;
    recharge();
    break;
  }
}

/** The main function is called when the page has loaded */
function main() {
  let urlParams = {};
  let match;
  const pl = /\+/g;
  const search = /([^&=]+)=?([^&]*)/g;
  const decode = (s) => decodeURIComponent(s.replace(pl, " "));
  const query = window.location.search.substring(1);

  while ((match = search.exec(query)) !== null) {
    urlParams[decode(match[1])] = decode(match[2]);
  }

  if (urlParams.n) n = parseInt(urlParams.n);
  if (urlParams.m) m = parseInt(urlParams.m);
  if (urlParams.charge) charge = parseInt(urlParams.charge);
  if ("nohelp" in urlParams) {
    document.getElementById("nav").style.display = "none";
  }
  if ("notrees" in urlParams) {
    drawCRtrees = false;
    document.getElementById("crtrees").style.display = "none";
  }

  document.getElementById("n").innerText = n;
  document.getElementById("m").innerText = m;
  document.getElementById("charge").innerText = charge;

  document.addEventListener("keypress", (event) => pressKey(event.key));
  document.getElementById("up").addEventListener("click",
    () => pressKey("ArrowUp"));
  document.getElementById("down").addEventListener("click",
    () => pressKey("ArrowDown"));
  document.getElementById("left").addEventListener("click",
    () => pressKey("ArrowLeft"));
  document.getElementById("right").addEventListener("click",
    () => pressKey("ArrowRight"));
  document.getElementById("reload").addEventListener("click",
    () => pressKey("r"));

  reload();
}

window.onload = main;
