# TestMe - AI-Powered Quiz Generator

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green?logo=mongodb)](https://www.mongodb.com/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-3-black?logo=vercel)](https://sdk.vercel.ai/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-brightgreen.svg)]()

> **Transform any content into engaging quizzes with the power of AI**

TestMe is a production-ready, full-stack web application that generates intelligent quizzes from multiple content sources using advanced AI. Built with modern technologies and designed for scalability, it supports YouTube videos, PDFs, images, and custom text to create engaging multiple-choice, true/false, and mathematical questions.

**🎯 Perfect for**: Educators, content creators, training organizations, and anyone looking to create interactive learning experiences.

**🚀 Live Demo**: [https://test-me-beta.vercel.app](https://test-me-beta.vercel.app)

## 📑 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Demo](#-demo)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
- [AI Provider Setup](#-ai-provider-setup)
  - [OpenAI (Recommended)](#openai-recommended)
  - [Anthropic Claude](#anthropic-claude)
  - [DeepSeek](#deepseek)
  - [AWS Bedrock](#aws-bedrock)
  - [Provider Comparison](#provider-comparison)
- [API Keys Setup Guide](#-api-keys-setup-guide)
- [Development](#-development)
- [Deployment](#-deployment)
- [Configuration Management](#-configuration-management)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)
- [Developer](#-developer)
- [Enhanced Large Quiz Generation](#-enhanced-large-quiz-generation)

## ⚡ Quick Start

Want to get TestMe running quickly? Follow these essential steps:

```bash
# 1. Clone and install
git clone https://github.com/nosisky/testme.git
cd testme
npm install

# 2. Setup environment (copy and fill with your API keys)
cp env.example .env.local

# 3. Start development server
npm run dev
```

**Essential environment variables to configure:**
- `OPENAI_API_KEY` - For AI quiz generation
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For authentication
- `MONGODB_URI` - For database storage
- `YOUTUBE_API_KEY` - For YouTube video processing

📚 **Detailed setup instructions are available in the [Getting Started](#-getting-started) section below.**

## ✨ Features

### 🎯 **Core Functionality**
- **Multi-Source Content**: Generate quizzes from YouTube videos, PDFs (up to 5 pages), images, and custom text
- **AI-Powered Knowledge Gap Analysis**: Automatically identifies learning gaps and key topics
- **Smart Question Generation**: Creates multiple-choice, true/false, and mathematical questions
- **Adaptive Difficulty**: Customizable difficulty levels (easy, medium, hard)
- **LaTeX Math Support**: Full mathematical equation rendering with MathJax

### 🎨 **User Experience**
- **Interactive Quiz Interface**: Animated quiz-taking experience with real-time feedback
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode**: Professional UI with theme switching
- **Quiz Sharing**: Share quizzes via secure links
- **Performance Analytics**: Detailed quiz statistics and user performance tracking

### 🔐 **Security & Authentication**
- **Google OAuth Integration**: Secure authentication with Google accounts
- **User Management**: Role-based access control (admin/user)
- **Data Privacy**: Secure storage of user data and quiz results

### 🤖 **AI Integration**
- **Multiple AI Providers**: Support for OpenAI, Anthropic Claude, DeepSeek, and AWS Bedrock
- **Environment-Based Configuration**: Secure API key management
- **Fallback Systems**: Robust error handling with mock service support
- **Cost Optimization**: Choose providers based on budget and performance needs

## 🚀 Demo

Visit our live demo: [https://test-me-beta.vercel.app](https://test-me-beta.vercel.app)

**Test Account**: Use Google OAuth to create your account or try the demo content.

## 🛠 Technology Stack

### **Frontend**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: SCSS Modules with CSS Variables
- **UI Components**: Custom React components with responsive design
- **Math Rendering**: MathJax for LaTeX equation support

### **Backend**
- **Runtime**: Node.js with Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with Google OAuth
- **File Processing**: PDF parsing, image analysis, YouTube transcript extraction

### **AI Integration**
- **AI SDK**: Vercel AI SDK for unified provider interface
- **Providers**: OpenAI, Anthropic Claude, DeepSeek, AWS Bedrock
- **Vision**: OpenAI GPT-4 Vision for image text extraction

### **Deployment & DevOps**
- **Platform**: Vercel (recommended) or Docker
- **Monitoring**: Built-in analytics and error tracking
- **CI/CD**: GitHub Actions ready

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **MongoDB**: Local instance or MongoDB Atlas
- **Git**: Version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/testme.git
   cd testme
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env.local
   ```

### Environment Configuration

Create a `.env.local` file in the root directory with the following configuration:

```bash
# =================================================================
# APPLICATION CONFIGURATION
# =================================================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# =================================================================
# AUTHENTICATION (Required)
# =================================================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# =================================================================
# DATABASE (Required)
# =================================================================
MONGODB_URI=mongodb://localhost:27017/testme
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/testme

# =================================================================
# EXTERNAL APIs (Required)
# =================================================================
YOUTUBE_API_KEY=your_youtube_api_key

# =================================================================
# AI PROVIDER CONFIGURATION
# =================================================================
# Choose your primary AI provider (openai, claude, deepseek, bedrock)
DEFAULT_AI_PROVIDER=openai

# Configure API keys for your chosen provider(s)
# OpenAI (Recommended - reliable, fast, good quality)
OPENAI_API_KEY=your_openai_api_key

# Anthropic Claude (Best for detailed explanations)
CLAUDE_API_KEY=your_claude_api_key

# DeepSeek (Most cost-effective option)
DEEPSEEK_API_KEY=your_deepseek_api_key

# AWS Bedrock (Enterprise-grade, requires AWS setup)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# =================================================================
# DEVELOPMENT & TESTING
# =================================================================
# Set to 'true' to use mock AI service for testing (no API costs)
USE_MOCK_AI=false

# Set to 'development' for detailed logging
NODE_ENV=development
```

## 🤖 AI Provider Setup

### OpenAI (Recommended)

**Best for**: General use, reliable performance, fastest responses

- **Models**: GPT-4o-mini (default), GPT-4, GPT-3.5-turbo
- **Pricing**: ~$0.0001 per 1K tokens (very affordable)
- **Setup**: [Get API key](https://platform.openai.com/api-keys)

```bash
DEFAULT_AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here
```

### Anthropic Claude

**Best for**: Detailed explanations, complex reasoning, educational content

- **Models**: Claude-3-haiku (default), Claude-3-sonnet
- **Pricing**: ~$0.00025 per 1K tokens
- **Setup**: [Get API key](https://console.anthropic.com/)

```bash
DEFAULT_AI_PROVIDER=claude
CLAUDE_API_KEY=sk-ant-your-claude-key-here
```

### DeepSeek

**Best for**: Cost-effective alternative, budget-conscious deployments

- **Models**: deepseek-chat (default)
- **Pricing**: ~$0.00014 per 1K tokens (most affordable)
- **Setup**: [Get API key](https://platform.deepseek.com/)

```bash
DEFAULT_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
```

### AWS Bedrock

**Best for**: Enterprise use, enhanced security, compliance requirements

- **Models**: Claude-3.7-Sonnet (via inference profile)
- **Pricing**: Variable based on AWS pricing
- **Setup**: Requires AWS account and Bedrock access

```bash
DEFAULT_AI_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

**Important**: Bedrock uses inference profiles for newer Claude models. The system automatically uses `us.anthropic.claude-3-7-sonnet-20250219-v1:0` which is the cross-region inference profile for Claude 3.7 Sonnet.

**JSON Output**: Since Bedrock Claude models don't have native JSON mode, TestMe uses clear delimiters (`<JSON_START>` and `<JSON_END>`) to ensure reliable JSON extraction from responses.

**Supported regions**: us-east-1, us-east-2, us-west-2 (automatically routed based on availability)

### Provider Comparison

| Provider | Cost | Speed | Quality | Best Use Case |
|----------|------|-------|---------|---------------|
| **OpenAI** | 💰💰 | ⚡⚡⚡ | ⭐⭐⭐ | General purpose, production |
| **Claude** | 💰💰💰 | ⚡⚡ | ⭐⭐⭐⭐ | Educational content, detailed explanations |
| **DeepSeek** | 💰 | ⚡⚡ | ⭐⭐⭐ | Budget deployments, development |
| **Bedrock** | 💰💰💰 | ⚡⚡ | ⭐⭐⭐⭐ | Enterprise, compliance-critical |

## 🔑 API Keys Setup Guide

### 1. Google OAuth Setup (Required)

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **People API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth client ID** with these settings:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)

### 2. YouTube API Setup (Required)

1. In the same Google Cloud project
2. Enable **YouTube Data API v3**
3. Create **API Key** and restrict it to YouTube Data API
4. Add domains that will use the API

### 3. MongoDB Setup (Required)

**Option A: MongoDB Atlas (Recommended for production)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Create database user with read/write permissions
4. Whitelist your IP address (or 0.0.0.0/0 for development)
5. Get connection string

**Option B: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb-community # macOS
# or follow official installation guide for your OS

# Start MongoDB service
brew services start mongodb-community
```

### 4. Generate NextAuth Secret

```bash
# Generate a secure random string
openssl rand -base64 32
```

## 💻 Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npm run type-check
```

### Development Features

- **Hot Reload**: Instant updates during development
- **TypeScript**: Full type safety and IntelliSense
- **ESLint**: Code quality and consistency
- **SCSS Modules**: Scoped styling with CSS variables
- **Mock AI Service**: Test without API costs

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Environment Variables**
   - Copy all variables from `.env.local` to Vercel dashboard
   - Set `NEXTAUTH_URL` to your production domain
   - Ensure all API keys are properly configured

3. **Domain Configuration**
   - Update Google OAuth redirect URIs with production domain
   - Update CORS settings if needed

### Docker Deployment

```bash
# Build Docker image
docker build -t testme .

# Run container
docker run -p 3000:3000 --env-file .env.local testme
```

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## ⚙️ Configuration Management

### AI Provider Switching

Change AI provider without code changes:

```bash
# Switch to Claude
DEFAULT_AI_PROVIDER=claude

# Switch to DeepSeek  
DEFAULT_AI_PROVIDER=deepseek

# Restart application
npm run dev
```

### Environment-Based Configuration

- **Development**: Use mock services and local databases
- **Staging**: Test with real APIs and staging databases
- **Production**: Full configuration with monitoring

### Security Best Practices

- ✅ Store API keys in environment variables only
- ✅ Use different API keys for different environments
- ✅ Regularly rotate API keys
- ✅ Monitor API usage and costs
- ✅ Implement rate limiting

## 🏗 Architecture

### System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React UI      │    │ • Authentication│    │ • AI Providers  │
│ • SCSS Modules  │    │ • Quiz Logic    │    │ • YouTube API   │
│ • TypeScript    │    │ • File Processing│   │ • MongoDB       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Content Input**: User uploads/inputs content
2. **Analysis**: AI analyzes content for key topics and gaps
3. **Generation**: AI creates targeted quiz questions
4. **Storage**: Quiz saved to MongoDB
5. **Delivery**: Interactive quiz served to users
6. **Analytics**: Performance tracking and insights

### Security Architecture

- **Authentication**: Google OAuth with NextAuth.js
- **Authorization**: Role-based access control
- **Data Protection**: Encrypted storage and transmission
- **API Security**: Rate limiting and input validation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Prettier**: Code formatting
- **SCSS**: Use modules and CSS variables
- **Testing**: Write tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

### Lead Developer

**Dealwap**
- 📧 Email: [nosisky@gmail.com](mailto:nosisky@gmail.com)
- 💼 GitHub: [@nosisky](https://github.com/nosisky)
- 🐦 Twitter: [@dealwap](https://twitter.com/dealwap)

### Project Information

- **Version**: 1.0.0
- **Last Updated**: December 2024
- **Status**: Production Ready ✅
- **Maintenance**: Actively maintained
- **License**: MIT License

### Support & Contact

For support, feature requests, or bug reports:

1. **GitHub Issues**: [Create an issue](https://github.com/nosisky/testme/issues) - Best for bug reports and feature requests
2. **Email**: [nosisky@gmail.com](mailto:nosisky@gmail.com) - For direct communication and business inquiries
3. **Documentation**: Check this README and inline code comments
4. **Community**: Star the repo and follow for updates

### Acknowledgments

Special thanks to:
- **Vercel AI SDK** team for the excellent AI integration tools
- **Next.js** team for the amazing full-stack framework
- **OpenAI, Anthropic, DeepSeek, AWS** for providing powerful AI models
- The open-source community for inspiration and support

---

<div align="center">

# TestMe - AI-Powered Quiz Generator

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green?logo=mongodb)](https://www.mongodb.com/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-3-black?logo=vercel)](https://sdk.vercel.ai/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-brightgreen.svg)]()

> **Transform any content into engaging quizzes with the power of AI**

TestMe is a production-ready, full-stack web application that generates intelligent quizzes from multiple content sources using advanced AI. Built with modern technologies and designed for scalability, it supports YouTube videos, PDFs, images, and custom text to create engaging multiple-choice, true/false, and mathematical questions.

**🎯 Perfect for**: Educators, content creators, training organizations, and anyone looking to create interactive learning experiences.

**🚀 Live Demo**: [https://test-me-beta.vercel.app](https://test-me-beta.vercel.app)

## 📑 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Demo](#-demo)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
- [AI Provider Setup](#-ai-provider-setup)
  - [OpenAI (Recommended)](#openai-recommended)
  - [Anthropic Claude](#anthropic-claude)
  - [DeepSeek](#deepseek)
  - [AWS Bedrock](#aws-bedrock)
  - [Provider Comparison](#provider-comparison)
- [API Keys Setup Guide](#-api-keys-setup-guide)
- [Development](#-development)
- [Deployment](#-deployment)
- [Configuration Management](#-configuration-management)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)
- [Developer](#-developer)
- [Enhanced Large Quiz Generation](#-enhanced-large-quiz-generation)

## ⚡ Quick Start

Want to get TestMe running quickly? Follow these essential steps:

```bash
# 1. Clone and install
git clone https://github.com/nosisky/testme.git
cd testme
npm install

# 2. Setup environment (copy and fill with your API keys)
cp env.example .env.local

# 3. Start development server
npm run dev
```

**Essential environment variables to configure:**
- `OPENAI_API_KEY` - For AI quiz generation
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For authentication
- `MONGODB_URI` - For database storage
- `YOUTUBE_API_KEY` - For YouTube video processing

📚 **Detailed setup instructions are available in the [Getting Started](#-getting-started) section below.**

## ✨ Features

### 🎯 **Core Functionality**
- **Multi-Source Content**: Generate quizzes from YouTube videos, PDFs (up to 5 pages), images, and custom text
- **AI-Powered Knowledge Gap Analysis**: Automatically identifies learning gaps and key topics
- **Smart Question Generation**: Creates multiple-choice, true/false, and mathematical questions
- **Adaptive Difficulty**: Customizable difficulty levels (easy, medium, hard)
- **LaTeX Math Support**: Full mathematical equation rendering with MathJax

### 🎨 **User Experience**
- **Interactive Quiz Interface**: Animated quiz-taking experience with real-time feedback
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode**: Professional UI with theme switching
- **Quiz Sharing**: Share quizzes via secure links
- **Performance Analytics**: Detailed quiz statistics and user performance tracking

### 🔐 **Security & Authentication**
- **Google OAuth Integration**: Secure authentication with Google accounts
- **User Management**: Role-based access control (admin/user)
- **Data Privacy**: Secure storage of user data and quiz results

### 🤖 **AI Integration**
- **Multiple AI Providers**: Support for OpenAI, Anthropic Claude, DeepSeek, and AWS Bedrock
- **Environment-Based Configuration**: Secure API key management
- **Fallback Systems**: Robust error handling with mock service support
- **Cost Optimization**: Choose providers based on budget and performance needs

## 🚀 Demo

Visit our live demo: [https://test-me-beta.vercel.app](https://test-me-beta.vercel.app)

**Test Account**: Use Google OAuth to create your account or try the demo content.

## 🛠 Technology Stack

### **Frontend**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: SCSS Modules with CSS Variables
- **UI Components**: Custom React components with responsive design
- **Math Rendering**: MathJax for LaTeX equation support

### **Backend**
- **Runtime**: Node.js with Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with Google OAuth
- **File Processing**: PDF parsing, image analysis, YouTube transcript extraction

### **AI Integration**
- **AI SDK**: Vercel AI SDK for unified provider interface
- **Providers**: OpenAI, Anthropic Claude, DeepSeek, AWS Bedrock
- **Vision**: OpenAI GPT-4 Vision for image text extraction

### **Deployment & DevOps**
- **Platform**: Vercel (recommended) or Docker
- **Monitoring**: Built-in analytics and error tracking
- **CI/CD**: GitHub Actions ready

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **MongoDB**: Local instance or MongoDB Atlas
- **Git**: Version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/testme.git
   cd testme
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env.local
   ```

### Environment Configuration

Create a `.env.local` file in the root directory with the following configuration:

```bash
# =================================================================
# APPLICATION CONFIGURATION
# =================================================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# =================================================================
# AUTHENTICATION (Required)
# =================================================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# =================================================================
# DATABASE (Required)
# =================================================================
MONGODB_URI=mongodb://localhost:27017/testme
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/testme

# =================================================================
# EXTERNAL APIs (Required)
# =================================================================
YOUTUBE_API_KEY=your_youtube_api_key

# =================================================================
# AI PROVIDER CONFIGURATION
# =================================================================
# Choose your primary AI provider (openai, claude, deepseek, bedrock)
DEFAULT_AI_PROVIDER=openai

# Configure API keys for your chosen provider(s)
# OpenAI (Recommended - reliable, fast, good quality)
OPENAI_API_KEY=your_openai_api_key

# Anthropic Claude (Best for detailed explanations)
CLAUDE_API_KEY=your_claude_api_key

# DeepSeek (Most cost-effective option)
DEEPSEEK_API_KEY=your_deepseek_api_key

# AWS Bedrock (Enterprise-grade, requires AWS setup)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# =================================================================
# DEVELOPMENT & TESTING
# =================================================================
# Set to 'true' to use mock AI service for testing (no API costs)
USE_MOCK_AI=false

# Set to 'development' for detailed logging
NODE_ENV=development
```

## 🤖 AI Provider Setup

### OpenAI (Recommended)

**Best for**: General use, reliable performance, fastest responses

- **Models**: GPT-4o-mini (default), GPT-4, GPT-3.5-turbo
- **Pricing**: ~$0.0001 per 1K tokens (very affordable)
- **Setup**: [Get API key](https://platform.openai.com/api-keys)

```bash
DEFAULT_AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here
```

### Anthropic Claude

**Best for**: Detailed explanations, complex reasoning, educational content

- **Models**: Claude-3-haiku (default), Claude-3-sonnet
- **Pricing**: ~$0.00025 per 1K tokens
- **Setup**: [Get API key](https://console.anthropic.com/)

```bash
DEFAULT_AI_PROVIDER=claude
CLAUDE_API_KEY=sk-ant-your-claude-key-here
```

### DeepSeek

**Best for**: Cost-effective alternative, budget-conscious deployments

- **Models**: deepseek-chat (default)
- **Pricing**: ~$0.00014 per 1K tokens (most affordable)
- **Setup**: [Get API key](https://platform.deepseek.com/)

```bash
DEFAULT_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
```

### AWS Bedrock

**Best for**: Enterprise use, enhanced security, compliance requirements

- **Models**: Claude-3.7-Sonnet (via inference profile)
- **Pricing**: Variable based on AWS pricing
- **Setup**: Requires AWS account and Bedrock access

```bash
DEFAULT_AI_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

**Important**: Bedrock uses inference profiles for newer Claude models. The system automatically uses `us.anthropic.claude-3-7-sonnet-20250219-v1:0` which is the cross-region inference profile for Claude 3.7 Sonnet.

**JSON Output**: Since Bedrock Claude models don't have native JSON mode, TestMe uses clear delimiters (`<JSON_START>` and `<JSON_END>`) to ensure reliable JSON extraction from responses.

**Supported regions**: us-east-1, us-east-2, us-west-2 (automatically routed based on availability)

### Provider Comparison

| Provider | Cost | Speed | Quality | Best Use Case |
|----------|------|-------|---------|---------------|
| **OpenAI** | 💰💰 | ⚡⚡⚡ | ⭐⭐⭐ | General purpose, production |
| **Claude** | 💰💰💰 | ⚡⚡ | ⭐⭐⭐⭐ | Educational content, detailed explanations |
| **DeepSeek** | 💰 | ⚡⚡ | ⭐⭐⭐ | Budget deployments, development |
| **Bedrock** | 💰💰💰 | ⚡⚡ | ⭐⭐⭐⭐ | Enterprise, compliance-critical |

## 🔑 API Keys Setup Guide

### 1. Google OAuth Setup (Required)

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **People API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth client ID** with these settings:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)

### 2. YouTube API Setup (Required)

1. In the same Google Cloud project
2. Enable **YouTube Data API v3**
3. Create **API Key** and restrict it to YouTube Data API
4. Add domains that will use the API

### 3. MongoDB Setup (Required)

**Option A: MongoDB Atlas (Recommended for production)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Create database user with read/write permissions
4. Whitelist your IP address (or 0.0.0.0/0 for development)
5. Get connection string

**Option B: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb-community # macOS
# or follow official installation guide for your OS

# Start MongoDB service
brew services start mongodb-community
```

### 4. Generate NextAuth Secret

```bash
# Generate a secure random string
openssl rand -base64 32
```

## 💻 Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npm run type-check
```

### Development Features

- **Hot Reload**: Instant updates during development
- **TypeScript**: Full type safety and IntelliSense
- **ESLint**: Code quality and consistency
- **SCSS Modules**: Scoped styling with CSS variables
- **Mock AI Service**: Test without API costs

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Environment Variables**
   - Copy all variables from `.env.local` to Vercel dashboard
   - Set `NEXTAUTH_URL` to your production domain
   - Ensure all API keys are properly configured

3. **Domain Configuration**
   - Update Google OAuth redirect URIs with production domain
   - Update CORS settings if needed

### Docker Deployment

```bash
# Build Docker image
docker build -t testme .

# Run container
docker run -p 3000:3000 --env-file .env.local testme
```

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## ⚙️ Configuration Management

### AI Provider Switching

Change AI provider without code changes:

```bash
# Switch to Claude
DEFAULT_AI_PROVIDER=claude

# Switch to DeepSeek  
DEFAULT_AI_PROVIDER=deepseek

# Restart application
npm run dev
```

### Environment-Based Configuration

- **Development**: Use mock services and local databases
- **Staging**: Test with real APIs and staging databases
- **Production**: Full configuration with monitoring

### Security Best Practices

- ✅ Store API keys in environment variables only
- ✅ Use different API keys for different environments
- ✅ Regularly rotate API keys
- ✅ Monitor API usage and costs
- ✅ Implement rate limiting

## 🏗 Architecture

### System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React UI      │    │ • Authentication│    │ • AI Providers  │
│ • SCSS Modules  │    │ • Quiz Logic    │    │ • YouTube API   │
│ • TypeScript    │    │ • File Processing│   │ • MongoDB       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Content Input**: User uploads/inputs content
2. **Analysis**: AI analyzes content for key topics and gaps
3. **Generation**: AI creates targeted quiz questions
4. **Storage**: Quiz saved to MongoDB
5. **Delivery**: Interactive quiz served to users
6. **Analytics**: Performance tracking and insights

### Security Architecture

- **Authentication**: Google OAuth with NextAuth.js
- **Authorization**: Role-based access control
- **Data Protection**: Encrypted storage and transmission
- **API Security**: Rate limiting and input validation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Prettier**: Code formatting
- **SCSS**: Use modules and CSS variables
- **Testing**: Write tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

### Lead Developer

**Dealwap**
- 📧 Email: [nosisky@gmail.com](mailto:nosisky@gmail.com)
- 💼 GitHub: [@nosisky](https://github.com/nosisky)
- 🌐 Portfolio: [dealwap.dev](https://dealwap.dev)
- 🐦 Twitter: [@nosisky](https://twitter.com/nosisky)

### Project Information

- **Version**: 1.0.0
- **Last Updated**: December 2024
- **Status**: Production Ready ✅
- **Maintenance**: Actively maintained
- **License**: MIT License

### Support & Contact

For support, feature requests, or bug reports:

1. **GitHub Issues**: [Create an issue](https://github.com/nosisky/testme/issues) - Best for bug reports and feature requests
2. **Email**: [nosisky@gmail.com](mailto:nosisky@gmail.com) - For direct communication and business inquiries
3. **Documentation**: Check this README and inline code comments
4. **Community**: Star the repo and follow for updates

### Acknowledgments

Special thanks to:
- **Vercel AI SDK** team for the excellent AI integration tools
- **Next.js** team for the amazing full-stack framework
- **OpenAI, Anthropic, DeepSeek, AWS** for providing powerful AI models
- The open-source community for inspiration and support

---

<div align="center">

**Built with ❤️ by Dealwap**

*"Making education more engaging through AI-powered quiz generation"*

[![GitHub stars](https://img.shields.io/github/stars/nosisky/testme?style=social)](https://github.com/nosisky/testme)
[![GitHub forks](https://img.shields.io/github/forks/nosisky/testme?style=social)](https://github.com/nosisky/testme)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

</div>

## 🚀 Enhanced Large Quiz Generation

This application now supports **Dynamic Token Management + Chunked Generation** for generating 15+ questions reliably:

### Key Features

- **Automatic Chunking**: Large quiz requests (15+ questions) are automatically split into smaller chunks
- **Dynamic Token Limits**: Token limits are automatically adjusted based on request size:
  - 10-14 questions: 32,000 tokens
  - 15-19 questions: 64,000 tokens  
  - 20+ questions: 128,000 tokens (with beta headers)
- **Enhanced Bedrock Support**: Optimized for AWS Bedrock Claude 3.7 Sonnet
- **Intelligent Fallback**: If a chunk fails, returns successfully generated questions
- **Rate Limiting Protection**: Built-in delays between chunks to avoid throttling

### Configuration

Set your AI provider in `.env`:
```bash
DEFAULT_AI_PROVIDER=bedrock
AWS_REGION=us-east-1
```

### How It Works

1. **Small Requests (< 15 questions)**: Standard generation
2. **Large Requests (≥ 15 questions)**: 
   - Split into chunks of 7 questions each
   - Each chunk generated with 1-second delay
   - Results combined automatically
   - Enhanced token limits applied

This ensures reliable generation of large quizzes without hitting token limits or rate restrictions.

## �� AI Configuration
