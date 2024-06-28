# Color Refinement

A visual demo of the color refinement algorithm.

- Use it [online](https://holgerdell.github.io/color-refinement/)
- For offline use, you will need to download the external resources loaded at the top of index.html, and change the paths correspondingly.

## Screenshot

![screenshot](screenshot.png)

## Description

The color refinement algorithm is a heuristic method to detect whether two graphs are isomorphic (see, e.g., [GKMS17+]).
It is also known as the 1-dimensional Weisfeiler-Leman algorithm.

## Development

For local development, install your favorite JavaScript toolkit, such as [bun](https://bun.sh/).
Then install the dependencies and start the development server:

```bash
bun install --frozen-lockfile
bun dev
```

Run [prettier](https://prettier.io/) to format the code:

```bash
bun format
```

Run [eslint](https://eslint.org/) to check the code for errors:

```bash
bun lint
```

## Built with

- [D3.js](https://d3js.org/)
- [CSS grid](https://developer.mozilla.org/en-US/docs/Web/CSS/grid)
- [normalize.css](https://necolas.github.io/normalize.css/)

## References

[GKMS17+] Martin Grohe, Kristian Kersting, Martin Mladenov, and Pascal Schweitzer. Color Refinement and its Applications. In _An Introduction to Lifted Probabilistic Inference_. Cambridge
University Press. To appear. ([preprint url](https://www.lics.rwth-aachen.de/global/show_document.asp?id=aaaaaaaaabbtcqu))
