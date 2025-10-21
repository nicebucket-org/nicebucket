<div align="center">
  <img src="./assets/logo.jpg" alt="Logo of nicebucket" width="50%">
</div>

# nicebucket

An S3 GUI that doesn't suck. A simple, fast S3 bucket manager built with Tauri.

## Why we built nicebucket

We got tired of using the AWS console and CLI to manage files in S3.
Sometimes you want a simple file browser that just works. So we built one.

## Features

- **Browse any S3-compatible bucket** (S3, R2, etc.) like local folders
- **Upload** files individually
- **Download** files individually
- **Create and delete** folders
- **Move** files between folders
- **Preview** files without downloading
- **Secure credential management** using your system's keyring

## Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/6a7b4f6e-9e80-4226-b71e-3d48bbf891f9" alt="Demo of nicebucket" width="100%" controls>
</div>

## Installation

### Download

Download from the [Releases](https://github.com/nicebucket-org/nicebucket/releases) section.

## Getting Started

1. Launch nicebucket
2. Add your S3/R2/custom credentials (Access Key ID + Secret Access Key)
3. Click any bucket to browse its contents

That's it. No complex configuration, no CLI commands to remember.

## Development

Want to contribute or run nicebucket locally? Here's what you need:

### Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/) (20+)
- [Tauri CLI](https://v2.tauri.app/reference/cli/)

### Setup

Setup is quite simple: clone the repository, install dependencies and run the app:

```bash
git clone https://github.com/your-username/nicebucket.git
cd nicebucket
npm install
npm run dev
```

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Rust + Tauri
- **AWS Integration**: Rust AWS SDK
- **UI Components**: shadcn/ui

We chose this stack because it lets us use our TypeScript knowledge while not having to use Electron.
Just kidding, we did not have prior experience so we just decided on Tauri because it sounded promising.
So far we're quite happy with the decision.

## Contributing

Found a bug or want to add a feature? We'd love your help! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Roadmap

Want to see what's coming next? Check out our [ROADMAP.md](ROADMAP.md) to see what's up next.

## License

We share our code freely and want to keep it that way. That's why nicebucket is licensed under GPLv3 - see [LICENSE.md](LICENSE.md) for details.

---

Built with ❤️ using Tauri, React and Tailwind.
