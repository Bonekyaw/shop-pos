import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { sendAdminOtpEmail } from "./email/resend";

const resolvedSecret =
  process.env.BETTER_AUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
const authBaseUrl =
  process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";

function resolveAuthSecret(): string {
  if (resolvedSecret && resolvedSecret.length >= 32) {
    return resolvedSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Set BETTER_AUTH_SECRET or JWT_SECRET (at least 32 characters) for Better Auth.",
    );
  }
  return "01234567890123456789012345678901";
}

export const auth = betterAuth({
  secret: resolveAuthSecret(),
  baseURL: authBaseUrl,
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      pin: {
        type: "string",
        required: false,
        defaultValue: "",
        input: false,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "WAITER",
        input: false,
      },
      adminRole: {
        type: "string",
        required: false,
        input: false,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") {
          return;
        }
        const normalized = email.trim().toLowerCase();
        const admin = await prisma.user.findFirst({
          where: {
            email: normalized,
            role: "ADMIN",
            isActive: true,
          },
          select: { id: true },
        });
        if (!admin) {
          return;
        }
        await sendAdminOtpEmail({ email: normalized, otp });
      },
    }),
    nextCookies(),
  ],
});
