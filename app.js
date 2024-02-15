const fs = require("fs");
const Jimp = require("jimp");
const inquirer = require("inquirer");

const tryCatch = (callback) => {
  return async (props) => {
    try {
      await callback(props);
    } catch {
      console.log("Something went wrong... Try again!");
    }
  };
};

const addWatermarkToImage = tryCatch(async function ({
  inputPath,
  text,
  watermarkFile,
  adjust,
}) {
  const image = await Jimp.read(inputPath);
  const font = text ? await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK) : null;
  const watermark = watermarkFile ? await Jimp.read(watermarkFile) : null;

  if (font) {
    const textData = {
      text: text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    };

    image.print(font, 0, 0, textData, image.getWidth(), image.getHeight());
  } else if (watermark) {
    const x = image.getWidth() / 2 - watermark.getWidth() / 2;
    const y = image.getHeight() / 2 - watermark.getHeight() / 2;

    image.composite(watermark, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.5,
    });
  }

  if (adjust) adjust(image);

  const outputFile = "./img/" + prepareOutputFilename(inputPath);
  await image.quality(100).writeAsync(outputFile);

  success();
});

const prepareOutputFilename = (filepath) => {
  const file = filepath.split("/").pop();
  const [name, ext] = file.split(".");
  return `${name}-with-watermark.${ext}`;
};

const success = () => {
  console.log("Success!");
  startApp();
};

const startApp = async () => {
  const answer = await inquirer.prompt([
    {
      name: "start",
      message:
        'Hi! Welcome to "Watermark manager". Copy your image files to `/img` folder. Then you\'ll be able to use them in the app. Are you ready?',
      type: "confirm",
    },
  ]);

  if (!answer.start) process.exit();

  const options = await inquirer.prompt([
    {
      name: "inputImage",
      type: "input",
      message: "What file do you want to mark?",
      default: "test.jpg",
    },
    {
      name: "imageAdjust",
      type: "confirm",
      message: "Would You like to adjust the image tones?",
    },
    {
      name: "watermarkType",
      type: "list",
      choices: ["Text watermark", "Image watermark"],
    },
  ]);

  const inputPath = "./img/" + options.inputImage;

  if (!fs.existsSync(inputPath)) {
    throw new Error("Target image does not exist.");
  }

  let adjust;

  if (options.imageAdjust) {
    const choices = {
      "Make image brighter": (image) => image.brightness(0.25),
      "Increase contrast": (image) => image.contrast(0.25),
      "Make image b&w": (image) => image.greyscale(),
      "Invert Image": (image) => image.invert(),
    };

    adjust = await inquirer
      .prompt([
        {
          name: "adjustType",
          type: "list",
          choices: Object.keys(choices),
        },
      ])
      .then(({ adjustType }) => choices[adjustType]);
  }

  if (options.watermarkType === "Text watermark") {
    await inquirer
      .prompt([
        {
          name: "text",
          type: "input",
          message: "Type your watermark text:",
        },
      ])
      .then(({ text }) => addWatermarkToImage({ inputPath, text, adjust }));
  } else {
    await inquirer
      .prompt([
        {
          name: "filename",
          type: "input",
          message: "Type your watermark name:",
          default: "logo.png",
        },
      ])
      .then(({ filename }) => {
        if (!fs.existsSync("./img/" + filename)) {
          throw new Error("Watermark image does not exist.");
        }
        return addWatermarkToImage({
          inputPath,
          watermarkFile: "./img/" + filename,
          adjust,
        });
      });
  }
};

startApp();
