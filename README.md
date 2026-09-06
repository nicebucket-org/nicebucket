<div align="center">
  <img src="./assets/logo.png" alt="Logo of nicebucket" width="33%">
  <p align="center">A fast, private, open-source S3 GUI built with Tauri.</p>
</div>

# About

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

Upload files to the root of a bucket or withing a folder and preview them within seconds.

<video src="https://github.com/user-attachments/assets/6a7b4f6e-9e80-4226-b71e-3d48bbf891f9" alt="Demo of nicebucket" width="100%" controls></video>

Easily move files between folders.

<video src="https://github.com/user-attachments/assets/b6c7a7ea-3700-491d-baf4-ea5e3dd3374a" alt="Demo of nicebucket" width="100%" controls></video>

## Installation

### Download

Download from the [Releases](https://github.com/nicebucket-org/nicebucket/releases) section.

#### macOS

The macOS app is not signed or notarized. After copying it to Applications, remove it from quarantine before launching:

```bash
xattr -cr /Applications/nicebucket.app
```

#### Linux (Wayland)

Some non-Debian Wayland distributions require preloading the Wayland client library to launch the AppImage. We also had scaling glitches without `GDK_SCALE=1`, so keep it in the command below (adjust the binary name if needed):

```
LD_PRELOAD=/usr/lib/libwayland-client.so GDK_SCALE=1 ./nicebucket.AppImage
```

### Nix

If you use Nix with flakes enabled, you can run nicebucket directly without installing:

```bash
nix run github:nicebucket-org/nicebucket
```

Or install it to your system:

```bash
nix profile install github:nicebucket-org/nicebucket
```

For development with Nix:

```bash
# Enter the development shell with all dependencies
nix develop

# Then run the app
bun install
bun run tauri dev
```

## Getting Started

1. Launch nicebucket
2. Add your S3/R2/custom credentials (Access Key ID + Secret Access Key)
3. Click any bucket to browse its contents

That's it. No complex configuration, no CLI commands to remember.

## Development

Want to contribute or run nicebucket locally? Here's what you need:

### Prerequisites

- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/) (1.2+)

### Setup

Setup is quite simple: clone the repository, install dependencies and run the app:

```bash
git clone https://github.com/nicebucket-org/nicebucket.git
cd nicebucket
bun install
bun run tauri dev
```

## Tech Stack

- **Frontend**: Bun, Vite, React, TypeScript, Tailwind CSS
- **Backend**: Rust, Tauri
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

