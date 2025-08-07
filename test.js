const ChessImageGenerator = require(".");

const imageGenerator = new ChessImageGenerator({
  padding: [288, 44, 268, 44],
  size: 1316,
  light: "#ccc",
  dark: "#aaa",
  highlight: "#ff0000",
  //flipped: true,
});

imageGenerator.highlightSquares(["a1", "b4"]);
var fen = `r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1`;
imageGenerator.loadFEN(fen);
imageGenerator.addArrows([
  { from: "a1", to: "a4", color: "red" },
  { from: "c3", to: "f5", color: "green" },
  { from: "h6", to: "e6", color: "darkgray" },
]);
imageGenerator.generatePNG("test.png");
