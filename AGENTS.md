# AGENTS.md

As a Tauri developer, we're all about crafting applications that not only perform exceptionally but also look and feel amazing. We believe that a great user experience starts with clean, maintainable, and well-structured code. This document outlines some core principles to guide our development, ensuring our apps are both robust and aesthetically pleasing, inside and out.

---

## TypeScript & React Guidelines

When working with our frontend, primarily built with TypeScript and React, let's keep these practices in mind to ensure our code is readable, efficient, and a joy to maintain.

- **Prioritize Early Returns and Throw Errors in Guard Clauses:** Aim for clear, linear execution paths. Instead of nesting `if/else` statements, use early returns or guard clauses to handle edge cases or invalid conditions at the beginning of a function by throwing an error. This improves readability by reducing indentation and making the primary logic stand out.

  ```typescript
  // ✅ Good
  function processUserData(user: User | null) {
    if (!user) {
      throw new Error("No user provided.");
    }
    if (!user.isActive) {
      throw new Error("User is inactive.");
    }
    // ... continue with main logic
  }
  ```

- **Avoid `else` Statements (Where Possible):** Following the early return principle, try to minimize the use of `else` blocks. For simple conditional assignments or returns, a ternary operator is often cleaner. For more complex branching, early returns are usually preferable.

  ```typescript
  // ✅ Good
  const status = isActive ? "Active" : "Inactive";

  // ❌ Bad
  let status;
  if (isActive) {
    status = "Active";
  } else {
    status = "Inactive";
  }
  ```

- **Prefer Map Objects Over `switch` or Multiple `if/else`:** When you have a series of conditional actions or values based on a specific key, a `Record` (object map) is often more declarative and easier to extend than a `switch` statement or a chain of `if/else if`.

  ```typescript
  // ✅ Good
  type Command = "start" | "stop" | "pause";

  const commandHandlers: Record<Command, () => void> = {
    start: () => console.log("Starting..."),
    stop: () => console.log("Stopping..."),
    pause: () => console.log("Pausing..."),
  };

  const handler = commandHandlers[command];
  handler();

  // ❌ Bad
  function executeCommand(command: string) {
    switch (command) {
      case "start":
        console.log("Starting...");
        break;
      case "stop":
        console.log("Stopping...");
        break;
      case "pause":
        console.log("Pausing...");
        break;
      default:
        console.warn(`Unknown command: ${command}`);
    }
  }
  ```

- **Use String Unions Over TypeScript Enums:** For defining a fixed set of string values, string literal unions provide better type safety and often compile to slightly smaller JavaScript bundles than TypeScript `enum`s.

  ```typescript
  // ✅ Good
  type Theme = "light" | "dark" | "system";
  const currentTheme: Theme = "dark";

  // ❌ Bad
  enum Theme {
    Light = "light",
    Dark = "dark",
    System = "system",
  }
  const currentTheme: Theme = Theme.Dark;
  ```

- **Do not use hooks if they are not required**: When creating components, often times a simple `const` is sufficient, no need to use `useState` or other hooks.
- **Prefer `useState` to avoid `useEffect` for Local State:** When managing simple, local component state, prioritize `useState`. Reserve `useEffect` for side effects like data fetching, subscriptions, or manual DOM manipulations that cannot be expressed purely with `useState`.
- **Leverage TanStack Query for Async State Management:** For managing asynchronous data (fetching, caching, synchronizing, and updating server state), always prefer **TanStack Query**. It provides powerful tools to handle loading states, error handling, background refetching, and more efficiently.
- **Utilize TanStack Query's `queryOptions` API for Mutations:** When performing data mutations that impact existing cached data, use the **`queryOptions` API** to define how related queries should be invalidated or updated. This ensures UI consistency after data changes.
- **Implement Shadcn Skeletons for Loading States:** Instead of simple loading spinners, use **Shadcn Skeletons** to provide a better user experience during data loading. Skeletons mimic the structure of the content that's about to be displayed, giving users a sense of progress and reducing perceived wait times.

## Rust Guidelines

For our backend and core logic written in Rust, we'll focus on clarity, safety, and adherence to established best practices to build robust and performant applications. Our guiding principles are:

- **Follow Rust Best Practices:** Embrace idiomatic Rust, including proper **ownership and borrowing**, robust **error handling** with `Result`, **modularity**, clear **documentation**, and comprehensive **testing**. Always use `cargo clippy` and `cargo fmt`.
- **Prioritize Understandable Code:** Always write code that is **clear and straightforward**. Choose descriptive names, prefer simplicity, and avoid premature optimization. Readability for collaborators is paramount.
