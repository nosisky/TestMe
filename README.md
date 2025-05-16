# TestMe - YouTube Quiz Generator

TestMe is a web application that generates quizzes from YouTube videos, PDFs, images, and custom text. It leverages AI to create engaging multiple-choice questions to test knowledge and comprehension.

## Features

- **Content Sources**: Generate quizzes from YouTube videos, PDFs (up to 5 pages), images, and custom text
- **Quiz Configuration**: Customize the number of questions, difficulty levels, and question-skipping options
- **Interactive Quiz Experience**: Take quizzes with animations, score tracking, and explanations for answers
- **Quiz Sharing**: Share quizzes with others via links
- **User Authentication**: Secure login with Google Authentication
- **Responsive Design**: Works on all device sizes with a modern UI
- **Multiple AI Providers**: Support for OpenAI, Anthropic Claude, and DeepSeek models
- **MongoDB Integration**: Persistent storage for users, quizzes and results

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/testme.git
   cd testme
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   # NextAuth configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret

   # Google OAuth credentials for authentication
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # YouTube API key for retrieving video information and captions
   YOUTUBE_API_KEY=your_youtube_api_key

   # OpenAI API key for generating questions
   OPENAI_API_KEY=your_openai_api_key
   
   # MongoDB connection string
   MONGODB_URI=mongodb://localhost:27017/testme
   
   # AI model API keys (at least one is required)
   CLAUDE_API_KEY=your_claude_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   
   # Default AI provider (openai, claude, or deepseek)
   DEFAULT_AI_PROVIDER=openai
   ```

### API Keys Setup

1. **Google OAuth Credentials**:
   - Visit the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Navigate to "APIs & Services" > "Credentials"
   - Create an OAuth client ID with authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://your-production-domain.com/api/auth/callback/google` (for production)
   - Add the Client ID and Client Secret to your `.env.local` file

2. **YouTube API Key**:
   - In the Google Cloud Console, enable the "YouTube Data API v3"
   - Create an API key and restrict it to the YouTube Data API
   - Add the API key to your `.env.local` file

3. **OpenAI API Key**:
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Add the API key to your `.env.local` file

4. **NextAuth Secret**:
   - Generate a random string or use a tool like `openssl rand -base64 32` in your terminal
   - Add this as your NEXTAUTH_SECRET in the `.env.local` file

### Development

Start the development server:
```
npm run dev
```

The application will be available at `http://localhost:3000`

## Technical Stack

- **Framework**: Next.js with App Router
- **Styling**: SCSS Modules with dark/light mode support
- **Authentication**: NextAuth.js with Google provider
- **APIs**: YouTube Data API, OpenAI API
- **Deployment**: Vercel (recommended)

## Future Enhancements

- Database integration with MongoDB/Postgres
- Quiz analytics and performance tracking
- Social sharing features
- More question types (true/false, fill-in-the-blank)
- Custom quiz themes

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
