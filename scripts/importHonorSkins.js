const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const ROOT = path.join(__dirname, "..");
const SOURCE_ROOT = path.join(ROOT, "tmp", "honor-generated");
const TARGET_ROOT = path.join(ROOT, "assets", "skins");
const CLASSES = ["Warrior", "Mage", "Assassin", "Paladin", "Archer", "Wretch"];
const RANKS = ["Legendary", "Mythic", "Ancient", "Divine"];
const GENDERS = ["male", "female"];

const isCheckerboardPixel = (r, g, b) => {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  // Generated previews may blend the checkerboard with the small floor
  // shadow. Treat the full neutral-gray background range as removable; the
  // dark pixel outline keeps light costume details enclosed and untouched.
  return spread <= 24 && Math.min(r, g, b) >= 90;
};

const removeCheckerboard = (image) => {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height);
  const { data, width, height } = pixels;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    const pixelIndex = index * 4;
    if (!isCheckerboardPixel(data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2])) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    const pixelIndex = index * 4;
    data[pixelIndex + 3] = 0;
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
    enqueue(x - 1, y - 1);
    enqueue(x + 1, y - 1);
    enqueue(x - 1, y + 1);
    enqueue(x + 1, y + 1);
  }

  context.putImageData(pixels, 0, 0);
  return canvas;
};

const normalizeToGameFrame = (sourceCanvas) => {
  const target = createCanvas(300, 300);
  const context = target.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(sourceCanvas, 0, 0, 300, 300);
  return target;
};

const importOne = async (className, rank, gender) => {
  const fileName = `${className}Honor${rank}_${gender}.png`;
  const sourcePath = path.join(SOURCE_ROOT, className, fileName);
  const targetDir = path.join(TARGET_ROOT, className);
  const targetPath = path.join(targetDir, fileName);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing generated source: ${sourcePath}`);
  }

  const source = await loadImage(sourcePath);
  const cleaned = removeCheckerboard(source);
  const normalized = normalizeToGameFrame(cleaned);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetPath, normalized.toBuffer("image/png"));
  return targetPath;
};

const main = async () => {
  const imported = [];
  for (const className of CLASSES) {
    for (const rank of RANKS) {
      for (const gender of GENDERS) {
        imported.push(await importOne(className, rank, gender));
      }
    }
  }
  console.log(`Imported ${imported.length} gendered honor skin sprites with transparent backgrounds.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
