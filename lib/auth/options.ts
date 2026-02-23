import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDb();
        const user = await db
          .selectFrom("users")
          .select(["id", "email", "password_hash", "role"])
          .where("email", "=", credentials.email.toLowerCase())
          .executeTakeFirst();

        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(credentials.password, user.password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as "student" | "admin";
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
