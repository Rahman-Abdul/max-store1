export const runtime = "nodejs";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const identifier = String(credentials.email).trim();
        const password = String(credentials.password);

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
          include: {
            shopAssignments: {
              include: { shop: true },
            },
          },
        });

        if (!user) return null;

        if (user.status === "SUSPENDED") throw new Error("suspended");
        if (user.status === "INACTIVE") throw new Error("inactive");

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount: { increment: 1 } },
          }).catch(() => {});
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lastLoginAt: new Date() },
        }).catch(() => {});

        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            details: "User logged in successfully",
          },
        }).catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
          shops: user.shopAssignments.map((a) => ({
            id: a.shop.id,
            name: a.shop.name,
            slug: a.shop.slug,
          })),
        };
      },
    }),
  ],
});
