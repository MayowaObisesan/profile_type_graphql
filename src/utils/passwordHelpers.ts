import { User } from "@prisma/client";
import * as argon2 from "argon2";
import { prisma } from "../db";


export const setUserPassword = async (user: User, rawPassword: string) => {
    const passwordHash = await argon2.hash(rawPassword, { secret: Buffer.from(user.secret) });
    prisma.user.update({
        where: { email: user.email },
        data: { password: passwordHash }
    })
}