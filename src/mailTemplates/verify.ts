import fs from 'fs';
import path from 'path';

const verifyHTML = fs.readFileSync(path.join(__dirname, './verify.html'), {
  encoding: 'utf-8',
});

// export const verify = (url: string, year: string) => {
//   return verifyHTML.replace('{{link}}', `${url}`).replace('{{year}}', year);
// };

export const verify = (data: { url: string; year: number }) => {
  return verifyHTML.replace('{{link}}', `${data.url}`).replace('{{year}}', data.year.toString());
};
