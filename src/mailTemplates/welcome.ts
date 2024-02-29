import fs from 'fs';
import path from 'path';
import { EmailData } from '../utils/emailSending';
import { sendEmail } from '../utils/nodemailer';

const welcomeHTML = fs.readFileSync(path.join(__dirname, './welcome.html'), {
  encoding: 'utf-8',
});

// export const verify = (url: string, year: string) => {
//   return verifyHTML.replace('{{link}}', `${url}`).replace('{{year}}', year);
// };

export const welcomeEmail = (data: { name: string; regCode: string }) => {
  return welcomeHTML
    .replaceAll('{{name}}', `${data.name}`)
    .replace('{{regCode}}', data.regCode.toString());
};

export const sendWelcomeMail = async (emailData: EmailData) => {
  const emailMessage = welcomeEmail({ name: emailData.email, regCode: emailData.code });
  await sendEmail(emailData.email, 'Welcome to Profile', emailMessage);
}