![Logo of nicebucket](assets/logo.png)

# nicebucket

An S3 GUI that doesn't suck.
A simple, fast S3 bucket manager built with Tauri.
We created nicebucket to make managing AWS S3 files as easy as browsing local folders on your desktop.

## Why we built nicebucket

We got tired of switching between the AWS console and CLI tools just to manage files in S3.
Sometimes you just want a simple file browser that works like your operating system's file manager, but for S3 buckets.
So we built one.

## Features

- **Browse S3 buckets** like local folders
- **Upload** files
- **Download** files individually or in bulk
- **Create and delete** folders
- **Move** files between folders
- **Preview** files without downloading
- **Secure credential management** using your system's keyring

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

Setup is quite simple: clone the repoistory, install dependencies and run the app:

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

We chose this stack because it gives us the performance of a native app with the flexibility of web technologies.
Tauri was perfect for our needs - it's lightweight, secure, and lets us use our existing TypeScript knowledge.

## Contributing

Found a bug or want to add a feature? We'd love your help! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

We share our code freely and want to keep it that way. That's why nicebucket is licensed under GPLv3 - see [LICENSE.md](LICENSE.md) for details.

---

Built with ❤️ using Tauri, React and Tailwind.
