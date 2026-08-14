import fs from "node:fs";
import zlib from "node:zlib";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const channelCounts = new Map([
  [0, 1],
  [2, 3],
  [3, 1],
  [4, 2],
  [6, 4],
]);

function fail(message) {
  throw new Error(message);
}

function paeth(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function parsePng(filePath) {
  const png = fs.readFileSync(filePath);
  if (png.length < signature.length || !png.subarray(0, 8).equals(signature)) {
    fail("Screenshot evidence must be a PNG file.");
  }

  let offset = 8;
  let header;
  let palette;
  const compressedParts = [];
  while (offset < png.length) {
    if (offset + 12 > png.length) fail("PNG chunk header is truncated.");
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > png.length) fail(`PNG ${type} chunk is truncated.`);
    const data = png.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      if (header || length !== 13) fail("PNG IHDR chunk is invalid.");
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "PLTE") {
      palette = Buffer.from(data);
    } else if (type === "IDAT") {
      compressedParts.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!header || compressedParts.length === 0) {
    fail("PNG is missing IHDR or IDAT data.");
  }
  const { width, height, bitDepth, colorType, compression, filter, interlace } = header;
  const channels = channelCounts.get(colorType);
  if (!width || !height) fail("PNG dimensions must be positive.");
  if (bitDepth !== 8 || !channels) {
    fail(`Unsupported PNG format: bit depth ${bitDepth}, color type ${colorType}.`);
  }
  if (compression !== 0 || filter !== 0 || interlace !== 0) {
    fail("Only standard, non-interlaced PNG screenshots are supported.");
  }
  if (colorType === 3 && (!palette || palette.length === 0 || palette.length % 3 !== 0)) {
    fail("Indexed PNG is missing a valid palette.");
  }

  const stride = width * channels;
  const expectedLength = height * (stride + 1);
  if (!Number.isSafeInteger(expectedLength) || expectedLength > 512 * 1024 * 1024) {
    fail("PNG is too large to inspect safely.");
  }
  const inflated = zlib.inflateSync(Buffer.concat(compressedParts), {
    maxOutputLength: expectedLength,
  });
  if (inflated.length !== expectedLength) {
    fail(`PNG pixel data has length ${inflated.length}; expected ${expectedLength}.`);
  }

  const pixels = Buffer.alloc(height * stride);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    if (filterType > 4) fail(`Unsupported PNG row filter: ${filterType}.`);
    const rowOffset = y * stride;
    const previousOffset = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const encoded = inflated[inputOffset + x];
      const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
      const up = y > 0 ? pixels[previousOffset + x] : 0;
      const upperLeft = y > 0 && x >= channels
        ? pixels[previousOffset + x - channels]
        : 0;
      const predictor = [
        0,
        left,
        up,
        Math.floor((left + up) / 2),
        paeth(left, up, upperLeft),
      ][filterType];
      pixels[rowOffset + x] = (encoded + predictor) & 0xff;
    }
    inputOffset += stride;
  }

  return { width, height, colorType, channels, palette, pixels, stride };
}

function getRgb(image, x, y) {
  const offset = y * image.stride + x * image.channels;
  if (image.colorType === 0 || image.colorType === 4) {
    const gray = image.pixels[offset];
    return [gray, gray, gray];
  }
  if (image.colorType === 3) {
    const paletteOffset = image.pixels[offset] * 3;
    if (paletteOffset + 2 >= image.palette.length) {
      fail("Indexed PNG references a color outside its palette.");
    }
    return [
      image.palette[paletteOffset],
      image.palette[paletteOffset + 1],
      image.palette[paletteOffset + 2],
    ];
  }
  return [image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]];
}

function inspect(filePath) {
  const image = parsePng(filePath);
  let minR = 255;
  let minG = 255;
  let minB = 255;
  let maxR = 0;
  let maxG = 0;
  let maxB = 0;
  let darkSamples = 0;
  const luminances = [];
  const quantizedColors = new Set();
  const sampleGrid = 32;

  for (let gridX = 0; gridX < sampleGrid; gridX += 1) {
    for (let gridY = 0; gridY < sampleGrid; gridY += 1) {
      const x = Math.min(
        image.width - 1,
        Math.max(0, Math.round((image.width - 1) * ((gridX + 0.5) / sampleGrid))),
      );
      const y = Math.min(
        image.height - 1,
        Math.max(0, Math.round((image.height - 1) * ((gridY + 0.5) / sampleGrid))),
      );
      const [red, green, blue] = getRgb(image, x, y);
      minR = Math.min(minR, red);
      minG = Math.min(minG, green);
      minB = Math.min(minB, blue);
      maxR = Math.max(maxR, red);
      maxG = Math.max(maxG, green);
      maxB = Math.max(maxB, blue);
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      luminances.push(luminance);
      if (luminance < 35) darkSamples += 1;
      quantizedColors.add(
        `${Math.floor(red / 16)}-${Math.floor(green / 16)}-${Math.floor(blue / 16)}`,
      );
    }
  }

  const sampleRange = Math.max(maxR - minR, maxG - minG, maxB - minB);
  const mean = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
  const variance = luminances.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0,
  ) / luminances.length;
  const luminanceStdDev = Math.sqrt(variance);
  const darkSamplePercent = 100 * darkSamples / luminances.length;
  const lowInformation = sampleRange < 4 ||
    (luminanceStdDev < 12 && quantizedColors.size < 16) ||
    darkSamplePercent > 95;

  return {
    width: image.width,
    height: image.height,
    sampleRange,
    luminanceStdDev: Number(luminanceStdDev.toFixed(2)),
    quantizedColors: quantizedColors.size,
    darkSamplePercent: Number(darkSamplePercent.toFixed(2)),
    lowInformation,
  };
}

try {
  if (process.argv.length !== 3) {
    fail("Usage: node image-inspect.mjs <screenshot.png>");
  }
  process.stdout.write(`${JSON.stringify(inspect(process.argv[2]))}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
