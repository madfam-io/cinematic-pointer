# Contributing to Cinematic Pointer

Thank you for your interest in contributing to Cinematic Pointer! This document provides guidelines and instructions for contributing.

## Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/madfam/cinematic-pointer.git
   cd cinematic-pointer
   ```

2. Run the setup script:
   ```bash
   ./scripts/setup.sh
   ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

### Making Changes

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes and test:

   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

3. Commit using conventional commits:
   ```bash
   git commit -m "feat(module): add new feature"
   ```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test additions or fixes
- `build:` Build system changes
- `ci:` CI/CD changes
- `chore:` Other changes

### Testing

Run all tests:

```bash
npm test
npm run test:e2e
```

Run tests in watch mode:

```bash
npm run test:watch
```

Check coverage:

```bash
npm run test:coverage
```

### Code Quality

Before submitting a PR, ensure:

1. All tests pass
2. Code is properly formatted
3. No linting errors
4. TypeScript compiles without errors

```bash
npm run lint
npm run format
npm run typecheck
npm test
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all CI checks pass
4. Request review from maintainers
5. Address review feedback

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Error messages and stack traces

## Questions?

Open an issue for questions or discussions about development.
