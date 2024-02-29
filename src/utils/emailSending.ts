import { User } from "@prisma/client"
import RegistrationCode from "./codeGen";
import { sendWelcomeMail } from "../mailTemplates/welcome";
import { sendResetAccountMail } from "../mailTemplates/resetAccount";
import { EmailType } from "../types/enums";
import { EmailData } from "../types/types";


export const generateAndSendEmailCode = (user: User, emailType: EmailType): string => {
    // const currentTime = new Date().toJSON();
    const regCode = RegistrationCode.sign(`${user.email}${user.lastResendCodeAt}`, user.secret);
    const emailData: EmailData = {
        code: regCode.toUpperCase(),
        email: user.email,
        name: user.name,
        year: new Date().getFullYear()
    }
    if (emailType === EmailType.CREATE) {
        sendWelcomeMail(emailData);
    } else if (emailType === EmailType.RESET) {
        sendResetAccountMail(emailData);
    }

    return regCode
}