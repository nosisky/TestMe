# Contributing to TestMe

Thank you for your interest in contributing to TestMe! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions We Welcome

- 🐛 **Bug Reports**: Help us identify and fix issues
- ✨ **Feature Requests**: Suggest new features or improvements
- 📝 **Documentation**: Improve documentation and examples
- 🔧 **Code Contributions**: Bug fixes, new features, optimizations
- 🎨 **UI/UX Improvements**: Design enhancements and user experience improvements
- 🧪 **Testing**: Add tests and improve test coverage

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/testme.git
cd testme

# Add the original repository as upstream
git remote add upstream https://github.com/dealwap/testme.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env.local

# Configure your environment variables
# (See README.md for detailed setup instructions)

# Start development server
npm run dev
```

### 3. Create a Branch

```bash
# Create a new branch for your feature/fix
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

## 📋 Development Guidelines

### Code Style

We use TypeScript and follow these conventions:

- **TypeScript**: Use strict mode and proper typing
- **ESLint**: Follow the configured rules
- **Prettier**: Code will be auto-formatted
- **Naming**: Use camelCase for variables, PascalCase for components
- **File Structure**: Group related files in appropriate directories

### Component Guidelines

```typescript
// Example component structure
import React from 'react';
import styles from './ComponentName.module.scss';

interface ComponentNameProps {
  // Define props with proper TypeScript types
  title: string;
  optional?: boolean;
}

export default function ComponentName({ title, optional = false }: ComponentNameProps) {
  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      {optional && <p>Optional content</p>}
    </div>
  );
}
```

### API Route Guidelines

```typescript
// Example API route structure
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error description:', error);
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### Testing

- Write tests for new features
- Test both happy path and error cases
- Include edge cases and boundary conditions
- Test AI provider switching functionality

## 🎯 Specific Contribution Areas

### AI Provider Integration

If you want to add a new AI provider:

1. Update `src/lib/ai-config.ts` with the new provider configuration
2. Add the provider to `src/lib/ai-service.ts`
3. Update environment variable documentation
4. Add tests for the new provider
5. Update README.md with setup instructions

### UI/UX Improvements

- Follow the existing design system
- Ensure responsive design works on all devices
- Test dark/light mode compatibility
- Maintain accessibility standards

### Performance Optimizations

- Profile before and after changes
- Consider impact on bundle size
- Test with different AI providers
- Optimize database queries

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues to avoid duplicates
2. Test with the latest version
3. Try with different AI providers
4. Check browser console for errors

### Bug Report Template

```markdown
**Bug Description**
Clear and concise description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Node.js version: [e.g., 18.17.0]
- AI Provider: [e.g., OpenAI, Claude]

**Additional Context**
Add any other context, screenshots, or logs.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature you'd like to see.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
How you envision this feature working.

**Alternatives Considered**
Any alternative solutions you've considered.

**Additional Context**
Mockups, examples, or other relevant information.
```

## 📝 Pull Request Process

### Before Submitting

1. **Test thoroughly**: Ensure your changes work with different AI providers
2. **Update documentation**: Update README.md if needed
3. **Check code style**: Run `npm run lint`
4. **Test build**: Run `npm run build` to ensure it builds successfully
5. **Write descriptive commit messages**

### Pull Request Template

```markdown
**Description**
Brief description of changes.

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Other (please describe)

**Testing**
- [ ] Tested locally
- [ ] Tested with different AI providers
- [ ] Added/updated tests
- [ ] Tested responsive design

**Screenshots**
If applicable, add screenshots showing the changes.

**Checklist**
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

### Review Process

1. **Automated checks**: All GitHub Actions must pass
2. **Code review**: At least one maintainer will review
3. **Testing**: Changes will be tested across different scenarios
4. **Feedback**: Address any requested changes
5. **Merge**: Once approved, changes will be merged

## 🏗 Architecture Overview

### Project Structure

```
src/
├── app/                 # Next.js App Router pages and layouts
│   ├── api/            # API routes
│   ├── components/     # Page-specific components
│   └── styles/         # Global styles
├── components/         # Reusable components
├── lib/               # Utility libraries and configurations
│   ├── ai-config.ts   # AI provider configuration
│   ├── ai-service.ts  # AI service implementation
│   └── mongodb.ts     # Database connection
├── models/            # MongoDB models
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

### Key Files to Understand

- `src/lib/ai-config.ts`: AI provider configuration
- `src/lib/ai-service.ts`: Main AI service logic
- `src/app/api/`: All API endpoints
- `src/models/`: Database schemas

## 🚦 Development Workflow

### Daily Development

```bash
# Pull latest changes
git pull upstream main

# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push to your fork
git push origin feature/new-feature

# Create pull request on GitHub
```

### Testing Locally

```bash
# Run linting
npm run lint

# Build for production
npm run build

# Test with different AI providers
# Update DEFAULT_AI_PROVIDER in .env.local and restart
```

## 📞 Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Email**: [nosisky@gmail.com](mailto:nosisky@gmail.com) for direct contact

## 🎉 Recognition

Contributors will be recognized in:

- README.md acknowledgments
- Release notes for significant contributions
- GitHub contributor statistics

## 📄 License

By contributing to TestMe, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to TestMe! 🚀** 