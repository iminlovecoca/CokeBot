const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

async function transparentizeImage(filename) {
  const filePath = path.join(__dirname, "../assets/backgrounds", filename);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  const img = await loadImage(filePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imgData.data;

  // Let's sample the background color from the 4 corners
  // Corner pixels: (0,0), (width-1, 0), (0, height-1), (width-1, height-1)
  const bgR = (data[0] + data[(img.width - 1) * 4] + data[(img.height - 1) * img.width * 4]) / 3;
  const bgG = (data[1] + data[(img.width - 1) * 4 + 1] + data[(img.height - 1) * img.width * 4 + 1]) / 3;
  const bgB = (data[2] + data[(img.width - 1) * 4 + 2] + data[(img.height - 1) * img.width * 4 + 2]) / 3;

  console.log(`Analyzing ${filename}: Detected background color ~ rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`);

  // Flood fill / color distance thresholding to remove solid dark background
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    );

    // If close to background color or very dark grey/black
    if (dist < 32 || (r < 35 && g < 38 && b < 45 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10)) {
      data[i + 3] = 0; // Transparent
    } else if (dist < 48) {
      // Smooth edge antialiasing
      const alpha = (dist - 32) / 16;
      data[i + 3] = Math.floor(data[i + 3] * alpha);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Saved transparent background image: assets/backgrounds/${filename}`);
}

async function run() {
  await transparentizeImage("ko.png");
  await transparentizeImage("timeout.png");
}

run().catch(console.error);
