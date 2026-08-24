@AGENTS.md

# Claude App Development Guide (Expo / Node.js)

## 🛠️ Expo Go & Node.js Commands

- **Start Project:** `npx expo start --tunnel`
- **Install Package:** `npx expo install <package_name>` — see the SDK 54 note in `AGENTS.md`; plain `npm install` drifts a dependency off the pinned manifest.
- **Lint Code:** `npm run lint` or `npx eslint .`
- **Type Check:** `npx tsc`

## 🌿 Git Workflow Rules

- Always check the current branch using `git status` before editing files.
- Group related file changes into small, logical commits.
- Ask the user for a commit message or propose one before committing changes.

## 🧠 Core Engineering Workflow

Always strictly follow this 3-step workflow for every task:

1. **Explore:** Search the codebase and examine existing components or utilities first. Never guess file paths.
2. **Plan:** Present an architectural blueprint to the user. Wait for approval before modifying code.
3. **Execute:** Write clean, modular React Native code. Ensure compatibility with Expo Go (avoid linking native iOS/Android modules that require custom dev clients).

## 📋 Code Style & Architecture

- **React Native:** Use functional components with hooks. Prefer Tailwind (NativeWind) or StyleSheet for styles.
- **Node.js/Backend:** Write asynchronous, non-blocking code using async/await. Ensure proper try/catch error handling.
- **Type Safety:** Enforce strict type definitions; avoid using `any`.

## 🗣️ Communication Strategy

- Keep technical explanations highly concise and direct.
- **Clarification Rule:** If an Expo package or implementation requirement is ambiguous, stop and ask the user a specific multiple-choice question using `AskUserQuestion`. Do not assume.

## 📝 Git Commit Guidelines

When creating commits, always format the message using the following Conventional Commits structure:

`type(scope): short description in present tense`

### Allowed Types:

- `feat`: A new feature for the app
- `fix`: A bug fix
- `docs`: Documentation changes only
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, linting)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Updating build tasks, package manager configs, or dependencies
