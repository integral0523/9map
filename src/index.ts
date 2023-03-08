import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import sharp from "sharp";
import { zeropadding } from "./util/util";

const color = "red";
const pngSize = 1000;

const csvFileList = readdirSync(`${__dirname}/../csv`).filter((name) =>
  name.endsWith(".csv")
);
const csvList = csvFileList.map((csvFile) =>
  readFileSync(`${__dirname}/../csv/${csvFile}`, "utf-8")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.split(","))
);
const svg = readFileSync(`${__dirname}/../svg/9.svg`, "utf-8");

const date = new Date();
const resultDirPath = `${__dirname}/../result/${zeropadding(
  date.getMonth() + 1,
  2
)}${zeropadding(date.getDate(), 2)}-${zeropadding(
  date.getHours(),
  2
)}${zeropadding(date.getMinutes(), 2)}${zeropadding(date.getSeconds(), 2)}`;
mkdirSync(resultDirPath);
mkdirSync(`${resultDirPath}/svg`);
mkdirSync(`${resultDirPath}/png`);

type CityData = { [name: string]: number };
type Data = {
  year: number;
  month: number;
  city: CityData;
};

// 県ごと年月別のデータ
let max = 0;
const kenDataList: Data[][] = csvList.map((csv) => {
  const header = csv.shift();
  if (!header || !header.includes("発生年") || !header.includes("発生月"))
    throw "no header";
  const yearIndex = header.indexOf("発生年");
  const monthIndex = header.indexOf("発生月");
  let nowYear = 0;
  return csv.map((line) => {
    let year = Number(line[yearIndex]);
    if (year) nowYear = year;
    else year = nowYear;
    const city: CityData = {};
    line.forEach((v, i) => {
      if (i === yearIndex || i === monthIndex) return;
      const value = Number(v);
      city[header[i]] = value;
      if (value > max) max = value;
    });
    return {
      year,
      month: Number(line[monthIndex]),
      city,
    };
  });
});

// 県ごと年月別のデータに変える
const dataList: Data[] = [];
kenDataList.forEach((kdl) => {
  kdl.forEach((kd) => {
    // データリストの一致するもの
    const i = dataList.findIndex(
      (data) => data.year === kd.year && data.month === kd.month
    );
    if (i < 0) {
      dataList.push(kd);
    } else {
      Object.entries(kd.city).forEach(([city, count]) => {
        dataList[i].city[city] = count;
      });
    }
  });
});

dataList.forEach((d) => {
  let dsvg = svg;
  dsvg = dsvg.replace(
    '<tspan x="0" y="0">2000</tspan>',
    `<tspan x="0" y="0">${d.year}</tspan>`
  );
  dsvg = dsvg.replace(
    '<tspan x="0" y="0">12</tspan>',
    `<tspan x="0" y="0">${zeropadding(d.month, 2)}</tspan>`
  );
  Object.entries(d.city).forEach(([city, v]) => {
    if (!v) return;
    const opacity = v / max;
    if (
      (city.endsWith("市") || city.endsWith("郡")) &&
      dsvg.match(new RegExp(`<g id="_${city}">`))?.length
    ) {
      const reg = new RegExp(
        `<g id="_(${city})"><(polygon|path) class="cls-5" `
      );
      dsvg = dsvg.replace(
        reg,
        `<g id="$1"><$2 fill="${color}" fill-opacity="${opacity}" stroke-opacity="1" `
      );
    } else {
      const reg = new RegExp(
        `<g id="_(${city.replace(
          /(市|郡)$/,
          ""
        )})(市|郡)"><(polygon|path) class="cls-5" `
      );
      dsvg = dsvg.replace(
        reg,
        `<g id="$1$2"><$3 fill="${color}" fill-opacity="${opacity}" stroke-opacity="1" `
      );
    }
  });

  const filename = `${d.year}-${zeropadding(d.month, 2)}`;

  const resultPath = `${resultDirPath}/svg/${filename}.svg`;
  writeFileSync(resultPath, dsvg, "utf-8");

  sharp(resultPath)
    .resize(pngSize)
    .png({
      quality: 100,
    })
    .toFile(`${resultDirPath}/png/${filename}.png`)
    .catch((err: any) => {
      console.log(err);
    });
});
