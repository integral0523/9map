export const zeropadding = (num: number | string, count: number): string => {
  let result = String(num);
  for (let c = 0; c < count - result.length; c++) {
    result = "0" + result;
  }
  return result;
};
