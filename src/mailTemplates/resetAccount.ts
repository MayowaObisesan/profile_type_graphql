import fs from 'fs';
import path from 'path';
import { sendEmail } from '../utils/nodemailer';
import { EmailData } from '../types/types';

const resetAccountHTML = fs.readFileSync(path.join(__dirname, './resetAccount.html'), {
    encoding: 'utf-8',
});

export const resetAccountEmail = (data: { name: string; regCode: string, year: number }) => {
    return resetAccountHTML
        .replaceAll('{{name}}', `${data.name}`)
        .replace('{{regCode}}', data.regCode.toString())
        .replace('{{year}}', data.year.toString());
};

export const sendResetAccountMail = async (emailData: EmailData) => {
    const emailMessage = resetAccountEmail({ name: emailData.email, regCode: emailData.code, year: emailData.year });
    await sendEmail(emailData.email, 'Reset Profile Account', emailMessage);
}