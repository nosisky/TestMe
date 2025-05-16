import { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "./mongodb";
import User from "@/models/User";
import clientPromise from "@/lib/mongodb-adapter";

// Extend the session user type
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      preferences?: {
        theme?: string;
        quizDefaults?: {
          questionsCount: number;
          difficulty: string;
          allowSkipping: boolean;
        };
      };
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        console.log(profile, '===>');
        return {
          id: profile.sub, // Ensure we're using a consistent ID field
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
  callbacks: {
    async signIn() {
      // Allow OAuth providers to link to an existing account with the same email
      return true;
    },
    async redirect({ url, baseUrl }) {
      const parsedUrl = new URL(url);
      const callbackUrl = parsedUrl.searchParams.get('callbackUrl');

      // If a callbackUrl is present in the query parameters, prioritize it
      if (callbackUrl) {
        // Ensure the callbackUrl is relative to the baseUrl to prevent open redirect vulnerabilities
        if (callbackUrl.startsWith('/')) {
          return `${baseUrl}${callbackUrl}`;
        }
        // If callbackUrl is absolute but matches baseUrl, allow it
        if (callbackUrl.startsWith(baseUrl)) {
          return callbackUrl;
        }
        // Otherwise, ignore potentially malicious callbackUrl and redirect to dashboard
        console.warn(`Ignoring potentially unsafe callbackUrl: ${callbackUrl}`);
        return `${baseUrl}/dashboard`;
      }

      // Original logic for when no specific callbackUrl is found in query params
      // If the url is already prefixed with the baseUrl (and is not the sign-in page itself after login)
      if (url.startsWith(baseUrl) && url !== `${baseUrl}/login` && url !== `${baseUrl}/`) {
        return url; 
      }
      
      // Default to dashboard
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user, account }) {
      // Create or update user in our custom User model when JWT is created
      if (user && account?.provider === "google") {
        try {
          await dbConnect();
          const existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser && user.email) {
            await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              emailVerified: new Date(),
            });
          } else if (existingUser && user.name && user.image) {
            // Update user data if needed
            if (existingUser.name !== user.name || existingUser.image !== user.image) {
              existingUser.name = user.name as string;
              existingUser.image = user.image;
              await existingUser.save();
            }
          }
        } catch (error) {
          console.error("Error processing user data:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        
        // Fetch user preferences from our custom User model
        try {
          await dbConnect();
          const user = await User.findOne({ email: session.user.email });
          
          if (user) {
            session.user.role = user.role;
            session.user.preferences = user.preferences;
          }
        } catch (error) {
          console.error("Error fetching user data for session:", error);
        }
      }
      return session;
    },
  },
}; 