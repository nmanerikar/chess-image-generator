const { createCanvas, loadImage } = require("canvas");
const Frame = require("canvas-to-buffer");
const { Chess } = require("chess.js");
const fs = require("fs");
const path = require("path");

const {
  cols,
  white,
  black,
  defaultSize,
  defaultPadding,
  defaultLight,
  defaultDark,
  defaultHighlight,
  defaultStyle,
  filePaths,
} = require("./config/index");
const { col2n, drawArrow } = require("./arrow");
/**
 *
 * @typedef {object} Options
 * @property {number} [size] Pixel length of desired image
 * @property {string} [light] Color of light squares
 * @property {string} [dark] Color of dark squares
 * @property {string} [highlight] Color of highlight overlay
 * @property {"merida"|"alpha"|"cheq"} [style] Desired style of pieces
 * @property {boolean} [flipped] Whether the board is to be flipped or not
 */
/**
 * Object constructor, initializes options.
 * @param {Options} [options] Optional options
 */
function ChessImageGenerator(options = {}) {
  this.chess = new Chess();
  this.highlightedSquares = [];

  this.size = options.size || defaultSize;
  this.padding = options.padding || defaultPadding;
  this.light = options.light || defaultLight;
  this.dark = options.dark || defaultDark;
  this.highlight = options.highlight || defaultHighlight;
  this.style = options.style || defaultStyle;
  this.flipped = options.flipped || false;

  this.ready = false;
}

ChessImageGenerator.prototype = {
  /**
   * Loads PGN into chess.js object.
   * @param {string} pgn Chess game PGN
   */
  async loadPGN(pgn) {
    if (!this.chess.load_pgn(pgn)) {
      throw new Error("PGN could not be read successfully");
    } else {
      this.ready = true;
    }
  },

  /**
   * Loads FEN into chess.js object
   * @param {string} fen Chess position FEN
   */
  async loadFEN(fen) {
    if (!this.chess.load(fen)) {
      throw new Error("FEN could not be read successfully");
    } else {
      this.ready = true;
    }
  },

  addArrows(arrows) {
    this.arrows = arrows;
  },

  /**
   * Loads position array into chess.js object
   * @param {string[][]} array Chess position array
   */
  loadArray(array) {
    this.chess.clear();

    for (let i = 0; i < array.length; i += 1) {
      for (let j = 0; j < array[i].length; j += 1) {
        if (array[i][j] !== "" && black.includes(array[i][j].toLowerCase())) {
          this.chess.put(
            {
              type: array[i][j].toLowerCase(),
              color: white.includes(array[i][j]) ? "w" : "b",
            },
            cols[j] + (8 - i)
          );
        }
      }
    }
    this.ready = true;
  },

  /**
   * Set which squares should be highlighted
   * @param {string[]} array chess square coordinate array
   */
  highlightSquares(array) {
    this.highlightedSquares = array;
  },

  /**
   * Generates buffer image based on position
   * @returns {Promise<Buffer>} Image buffer
   */
  async generateBuffer() {
    if (!this.ready) {
      throw new Error("Load a position first");
    }

    const canvas = createCanvas(
      this.size + this.padding[1] + this.padding[3],
      this.size + this.padding[0] + this.padding[2]
    );
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.rect(
      0,
      0,
      this.size + this.padding[1] + this.padding[3],
      this.size + this.padding[0] + this.padding[2]
    );
    ctx.fillStyle = this.light;
    ctx.fill();

    const row = this.flipped ? (r) => r + 1 : (r) => 7 - r + 1;
    const col = this.flipped ? (c) => c : (c) => 7 - c;

    for (let i = 0; i < 8; i += 1) {
      for (let j = 0; j < 8; j += 1) {
        const coords = cols[col(j)] + row(i);

        if ((i + j) % 2 === 0) {
          ctx.beginPath();
          ctx.rect(
            (this.size / 8) * (7 - j + 1) - this.size / 8 + this.padding[3],
            (this.size / 8) * i + this.padding[0],
            this.size / 8,
            this.size / 8
          );
          ctx.fillStyle = this.dark;
          ctx.fill();
        }

        if (this.highlightedSquares.includes(coords)) {
          ctx.beginPath();
          ctx.rect(
            (this.size / 8) * (7 - j + 1) - this.size / 8 + this.padding[3],
            (this.size / 8) * i + this.padding[0],
            this.size / 8,
            this.size / 8
          );
          ctx.fillStyle = this.highlight;
          ctx.fill();
        }

        const piece = this.chess.get(coords);

        if (
          piece &&
          piece.type !== "" &&
          black.includes(piece.type.toLowerCase())
        ) {
          const image = `resources/${this.style}/${
            filePaths[`${piece.color}${piece.type}`]
          }.png`;
          const imageFile = await loadImage(path.join(__dirname, image));
          await ctx.drawImage(
            imageFile,
            (this.size / 8) * (7 - j + 1) - this.size / 8 + this.padding[3],
            (this.size / 8) * i + this.padding[0],
            this.size / 8,
            this.size / 8
          );
        }
      }
    }

    const sq = this.size / 8;
    const rc2xy = (a) => a * sq - sq / 2;

    this.arrows.forEach((arrow) => {
      const fromR = row(arrow.from[1] - 1);
      const fromC = 8 - col(col2n[arrow.from[0]]);
      const toR = row(arrow.to[1] - 1);
      const toC = 8 - col(col2n[arrow.to[0]]);

      drawArrow(
        ctx,
        rc2xy(fromC) + this.padding[3],
        rc2xy(fromR) + this.padding[0],
        rc2xy(toC) + this.padding[3],
        rc2xy(toR) + this.padding[0],
        sq / 10,
        arrow.color
      );
    });

    const frame = new Frame(canvas, {
      image: {
        types: ["png"],
      },
    });
    return frame.toBuffer();
  },

  /**
   * Generates PNG image based on position
   * @param {string} pngPath File name
   */
  async generatePNG(pngPath) {
    if (!this.ready) {
      throw new Error("Load a position first");
    }

    const buffer = await this.generateBuffer();

    fs.open(pngPath, "w", (err, fd) => {
      if (err) {
        throw new Error(`could not open file: ${err}`);
      }

      fs.write(fd, buffer, 0, buffer.length, null, (writeError) => {
        if (writeError) {
          throw new Error(`error writing file: ${writeError}`);
        }
        fs.close(fd, () => pngPath);
      });
    });
  },
};

module.exports = ChessImageGenerator;
