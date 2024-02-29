import { Fernet } from 'fernet-ts'
import { builder } from '../builder'
import { prisma } from '../db'
import { welcomeEmail } from '../mailTemplates/welcome'
import { sendEmail } from '../utils/nodemailer'
import { PostCreateInput } from './post'
import { SortOrder } from './shared'
import RegistrationCode from '../utils/codeGen'
import { generateAndSendEmailCode } from '../utils/emailSending'
import { EmailType } from '../types/enums'
import * as argon2 from "argon2";
import { setUserPassword } from '../utils/passwordHelpers'


// const { customAlphabet } = require('nanoid');
const alphabet = '346789ABCDEFGHJKLMNPQRTUVWXY';
// const nanoid = customAlphabet(alphabet, 8);

builder.prismaObject('User', {
  fields: (t) => ({
    id: t.exposeInt('id'),
    name: t.exposeString('name', { nullable: true }),
    email: t.exposeString('email'),
    // posts: t.relation('posts'),
    profile: t.relation('profile', { nullable: true })
  }),
})

builder.prismaObject('Profile', {
  fields: (t) => ({
    id: t.exposeInt('id'),
    bio: t.exposeString('bio', { nullable: true }),
    user: t.relation('user'),
  }),
})

builder.prismaObject('AccountCode', {
  fields: (t) => ({
    id: t.exposeInt('id'),
    regCode: t.exposeString('regCode', { nullable: true }),
    resetCode: t.exposeString('resetCode', { nullable: true }),
    user: t.relation('user'),
  }),
})


export const UserUniqueInput = builder.inputType('UserUniqueInput', {
  fields: (t) => ({
    id: t.int(),
    email: t.string(),
  }),
})

const UserCreateInput = builder.inputType('UserCreateInput', {
  fields: (t) => ({
    email: t.string({ required: true }),
    name: t.string(),
    posts: t.field({ type: [PostCreateInput] }),
  }),
})

const ResendSignupCodeInput = builder.inputType('ResendSignupCodeInput', {
  fields: (t) => ({
    email: t.string({ required: true })
  })
})

const VerifyUserInput = builder.inputType('VerifyUserInput', {
  fields: (t) => ({
    email: t.string({ required: true }),
    regCode: t.string({ required: true })
  })
})

const ForgotPasswordInput = builder.inputType('ForgotPasswordInput', {
  fields: (t) => ({
    email: t.string({ required: true })
  })
})

const VerifyForgotPasswordInput = builder.inputType('VerifyForgotPasswordInput', {
  fields: (t) => ({
    email: t.string({ required: true }),
    resetCode: t.string({ required: true })
  })
})

const SetPasswordInput = builder.inputType('SetPasswordInput', {
  fields: (t) => ({
    email: t.string({ required: true }),
    password: t.string({ required: true }),
    confirmPassword: t.string({ required: true })
  })
})

const ChangePasswordInput = builder.inputType('ChangePasswordInput', {
  fields: (t) => ({
    email: t.string({ required: true }),
    currentPassword: t.string({ required: true }),
    newPassword: t.string({ required: true })
  })
})

const UserOrderByUpdatedAtInput = builder.inputType(
  'UserOrderByUpdatedAtInput',
  {
    fields: (t) => ({
      updatedAt: t.field({
        type: SortOrder,
        required: true,
      }),
    }),
  },
)

builder.queryFields((t) => ({
  allUsers: t.prismaField({
    type: ['User'],
    args: {
      searchString: t.arg.string(),
      skip: t.arg.int(),
      take: t.arg.int(),
      orderBy: t.arg({
        type: UserOrderByUpdatedAtInput
      })
    },
    resolve: (query, parent, args) => {
      const or = args.searchString
        ? {
          OR: [
            {
              profile: {
                userName: { contains: args.searchString },
                firstName: { contains: args.searchString },
                lastName: { contains: args.searchString }
              }
            }
          ],
        }
        : []

      return prisma.user.findMany({
        ...query,
        where: {
          isBlacklisted: false,
          ...or
        },
        take: args.take ?? undefined,
        skip: args.skip ?? undefined,
        orderBy: args.orderBy ?? undefined
      })
    },
  }),
  userById: t.prismaField({
    type: 'User',
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (query, parent, args) => prisma.user.findUnique({
      ...query,
      where: { id: args.id }
    })
  }),
  allCode: t.prismaField({
    type: ['AccountCode'],
    nullable: true,
    args: {
      searchString: t.arg.string()
    },
    resolve: (query, parent, args) => {
      const or = args.searchString
        ? {
          OR: [
            {
              user: {
                userName: { contains: args.searchString },
                firstName: { contains: args.searchString },
                lastName: { contains: args.searchString },
              }
            }
          ]
        }
        : []

      return prisma.accountCode.findMany({
        ...query,
        where: {}
      })
    }
  }),
  // allProfile: t.prismaField({
  //   type: ['Profile'],
  //   // nullable: true,
  //   resolve: (query) => prisma.profile.findMany({ ...query })
  // })
}))

builder.mutationFields((t) => ({
  signupUser: t.prismaField({
    type: 'User',
    args: {
      data: t.arg({
        type: UserCreateInput,
        required: true,
      }),
    },
    resolve: async (query, parent, args) => {
      console.log("Generate secrets");
      const secret = "123456984958";
      // Fernet.generateSecret();
      console.log(secret);

      // nanoid() //=> "HJECJLTR"
      // console.log(nanoid());
      const currentTime = new Date().toJSON();
      const regCode = RegistrationCode.sign(`${args.data.email}${currentTime}`, secret);
      console.log(regCode);
      const emailMessage = welcomeEmail({ name: args.data.email, regCode: regCode });
      await sendEmail(args.data.email, 'Welcome to Profile', emailMessage);

      const newUser = prisma.user.create({
        ...query,
        data: {
          secret: secret,
          email: args.data.email,
          name: args.data.name,
          isActive: true,
          isRegistered: true,
          posts: {
            create: (args.data.posts ?? []).map((post) => ({
              title: post.title,
              content: post.content ?? undefined,
            })),
          },
          accountCode: {
            create: {
              regCode: regCode
            }
          },
          lastResendCodeAt: currentTime
        },
      })

      return newUser;
    },
  }),
  resendSignupCode: t.prismaField({
    type: 'User',
    args: {
      data: t.arg({
        type: ResendSignupCodeInput,
        required: true
      })
    },
    resolve: async (query, parent, args) => {
      // Fetch the user using the email
      const user = await prisma.user.findUniqueOrThrow({ where: { email: args.data.email } });

      const regCode = generateAndSendEmailCode(user, EmailType.CREATE);
      // const regCode = RegistrationCode.sign(`${args.data.email}${currentTime}`, user.secret);
      // const emailMessage = welcomeEmail({ name: args.data.email, regCode: regCode });
      // await sendEmail(args.data.email, 'Welcome to Profile', emailMessage);
      const currentTime = new Date().toJSON();

      // Update the user model lastResendCodeAt and the accountCode model regCode
      return prisma.user.update({
        where: { email: args.data.email },
        data: {
          lastResendCodeAt: currentTime,
          accountCode: {
            update: {
              regCode: regCode,
              updatedAt: currentTime
            }
          }
        }
      })

    }
  }),
  verifySignup: t.prismaField({
    type: 'User',
    args: {
      data: t.arg({
        type: VerifyUserInput,
        required: true
      }),
    },
    resolve: async (query, parent, args) => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email: args.data.email ?? undefined } })
      // if (!user) {
      //   throw "User does not exist"
      // }
      const regCodeObj = await prisma.accountCode.findUniqueOrThrow({
        where: {
          userId: user.id,
          regCode: args.data.regCode
        }
      })
      const codeValid = RegistrationCode.verify(`${args.data.email}${user.lastResendCodeAt}`, user.secret, args.data.regCode);
      if (!codeValid) {
        throw "code is invalid"
      }
      if (!regCodeObj) {
        throw "Error validating code"
      }
      const now = new Date();
      const diffInMinutes = (now.getTime() - regCodeObj.updatedAt.getTime()) / 1000 / 60;
      if (diffInMinutes > 5)
        throw "code is expired"

      // Check that the user is not already verified
      if (user.isVerified)
        throw "User already verified"

      // Update the user isVerified field
      return prisma.user.update({
        ...query,
        where: { id: user.id },
        data: {
          isVerified: true,
          accountCode: {
            delete: {
              id: regCodeObj.id
            }
          }
        }
      })

      // // Delete the regCodeObj once done
      // return prisma.accountCode.delete({
      //   where: { id: regCodeObj.id }
      // })
    }
  }),
  forgotPassword: t.prismaField({
    type: 'User',
    args: {
      data: t.arg({
        type: ForgotPasswordInput,
        required: true
      })
    },
    resolve: async (query, parent, args) => {
      /*
      Check that the user:
      1. Exists,
      2. is not blacklisted
      3. is verified
      */
      const user = await prisma.user.findUniqueOrThrow({ where: { email: args.data.email } });
      const userBlacklisted = await prisma.user.findUnique({ where: { email: args.data.email, isBlacklisted: true } });
      if (userBlacklisted) {
        throw "User is blacklisted";
      }
      const userNotVerified = await prisma.user.findUnique({ where: { email: args.data.email, isVerified: false } });
      if (userNotVerified) {
        throw "User is not verified yet. Kindly verify your account first";
      }

      // Begin the forgot password mutation process
      const currentTime = new Date().toJSON()
      // Update the lastResendCode Datetime
      prisma.user.update({
        where: { email: args.data.email },
        data: { lastResendCodeAt: currentTime },
      })

      const regCode = generateAndSendEmailCode(user, EmailType.RESET);

      // Update or Create the AccountCode model
      prisma.accountCode.upsert({
        where: { userId: user.id },
        update: { regCode: regCode },
        create: { userId: user.id, regCode: regCode }
      })

      return user
    }
  }),
  verifyForgotPassword: t.prismaField({
    type: 'User',
    args: {
      data: t.arg({
        type: VerifyForgotPasswordInput,
        required: true
      })
    },
    resolve: async (query, parent, args) => {
      if (args.data.resetCode.length !== 8) throw "Invalid code length"
      const user = await prisma.user.findUniqueOrThrow({ where: { email: args.data.email } });
      const resetCodeObj = await prisma.accountCode.findUniqueOrThrow({
        where: {
          userId: user.id,
          resetCode: args.data.resetCode
        }
      })
      const codeValid = RegistrationCode.verify(`${args.data.email}${user.lastResendCodeAt}`, user.secret, args.data.resetCode);
      if (!codeValid) {
        throw "Invalid code. Kindly request a new code"
      }
      const now = new Date();
      const diffInMinutes = (now.getTime() - resetCodeObj.updatedAt.getTime()) / 1000 / 60;
      if (diffInMinutes > 5)
        throw "Code has expired. Kindly request a new code"

      // Set an unusable password for the user, so that the user can no longer login using the previous password.
      prisma.user.update({
        where: { email: args.data.email },
        data: {
          password: RegistrationCode.generate(args.data.email, user.secret),
          accountCode: {
            delete: {
              id: resetCodeObj.id
            }
          }
        }
      })

      return user
    }
  }),
  setPassword: t.prismaField({
    type: 'User',
    args: {
      data: t.arg({
        type: SetPasswordInput,
        required: true
      })
    },
    resolve: async (query, parent, args) => {
      // Check that the user exists and is active and not blacklisted and is verified
      const user = await prisma.user.findUniqueOrThrow({ where: { email: args.data.email, isActive: true, isVerified: true, isBlacklisted: false } })
      // Validate passwords
      if (args.data.password.trim().length < 8) throw "Password cannot be less than 8 chars"
      if (args.data.password.trim() !== args.data.confirmPassword.trim()) throw "Passwords do not match"

      // generate the password hash
      // get the user for the secret to use in the password hash generation.
      const passwordHash = await argon2.hash(args.data.password, { secret: Buffer.from(user.secret) });
      prisma.user.update({
        where: { email: args.data.email },
        data: { password: passwordHash }
      })

      return user
    }
  }),
  changePassword: t.prismaField({
    type: 'User',
    args: {
      data: t.arg({
        type: ChangePasswordInput,
        required: true
      })
    },
    resolve: async (query, parent, args) => {
      // Check that the user exists and is active and not blacklisted and is verified
      const user = await prisma.user.findUniqueOrThrow({ where: { email: args.data.email, isActive: true, isVerified: true, isBlacklisted: false } })
      if (!user) throw "User not found"
      // Validate that currentPassword matches
      if (await argon2.verify(user.password as string, args.data.currentPassword, { secret: Buffer.from(user.secret) })) throw "This is not your current password"
      // validate newPassword length
      if (args.data.newPassword.trim().length < 8) throw "Password cannot be less than 8 chars"
      // validate currentPassword against newPassword
      if (args.data.currentPassword === args.data.newPassword) throw "Password cannot be the same"

      setUserPassword(user, args.data.newPassword);

      return user
    }
  })
}))
