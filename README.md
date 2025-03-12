# Video Meme Generator

A tool for creating and sharing video memes easily.

## Overview

Video Meme Generator is a web application that allows users to create, edit, and share video memes. This tool simplifies the process of adding your face to popular meme videos to create engaging and shareable content.

## Features

- Choose from popular meme templates (Jensen Huang or PSY entrance)
- Upload your face image
- Automatic face replacement in videos
- Download and share your custom memes

## Project Structure

```
video-meme/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── assets/         # Static assets
│   │   └── ...
├── server/                 # Node.js backend
│   ├── assets/             # Template videos and images
│   ├── uploads/            # User uploaded files
│   ├── public/             # Publicly accessible files
│   └── index.js            # Server entry point
└── package.json            # Root package.json
```

## Installation

```bash
# Clone the repository
git clone https://github.com/sergiopesch/video-meme.git

# Navigate to the project directory
cd video-meme

# Install all dependencies (root, client, and server)
npm run install-all
```

## Usage

### Development Mode

```bash
# Run both client and server in development mode
npm run dev
```

This will start:
- The React development server on http://localhost:5173
- The backend API server on http://localhost:5000

### Production Mode

```bash
# Build the client and start the production server
npm run prod
```

## How It Works

1. **Select a Meme Template**: Choose between Jensen Huang walking onto stage or PSY making a grand entrance.
2. **Upload Your Face**: Upload a clear image of your face.
3. **Generate Meme**: Our server processes the video, replacing the original face with yours.
4. **Download & Share**: Download your custom meme or share it directly to social media.

## Technical Implementation

The application uses:
- React for the frontend UI
- Express.js for the backend API
- face-api.js for face detection and tracking
- FFmpeg for video processing

In a full implementation, the face replacement would use computer vision techniques to:
1. Detect faces in the user-uploaded image
2. Track faces in the template video
3. Replace the face in the video with the user's face
4. Process the video and return it to the client

## Requirements

- Node.js (v14 or higher)
- Modern web browser
- FFmpeg for video processing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Sergio Peschiera - [@sergiopesch](https://github.com/sergiopesch)

Project Link: [https://github.com/sergiopesch/video-meme](https://github.com/sergiopesch/video-meme)
