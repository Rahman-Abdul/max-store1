import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
        token.avatar = (user as any).avatar;
        token.shops = (user as any).shops;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as UserRole;
        (session.user as any).username = token.username as string;
        (session.user as any).avatar = token.avatar as string;
        (session.user as any).shops = token.shops;
      }
      return session;
    },
  },
};
