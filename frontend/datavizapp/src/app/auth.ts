import { ROUTES } from "@/constants/routes"
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    }),],
  callbacks: {
    authorized: async ({ auth }) => !!auth,
  },
  pages: {
    signIn: ROUTES.loginPage, // Customized (can be removed for default sign-in page)
  }
})