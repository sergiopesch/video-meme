# Video Meme Generator with Segmind AI

A powerful application for creating interactive video memes with realistic animation using Segmind, an advanced AI video generation technology.

## Features

- **Realistic AI Video Generation**: Utilizes Segmind's state-of-the-art AI for high-quality video generation
- **Multiple Meme Templates**: Choose from popular meme templates (Lil Yachty, PSY)
- **Simple Interface**: Easy-to-use interface for uploading images and generating memes
- **Download & Share**: Easily download and share your creations
- **Fallback Mechanisms**: Automatic fallback to basic video processing if AI is unavailable

## Architecture

This application consists of:

- **Frontend**: React-based client for user interactions
- **Backend**: Node.js/Express server for processing and video generation
- **Segmind Integration**: API integration with Segmind's video generation service
- **Fallback Mechanism**: Basic ffmpeg overlay as a reliable fallback

## Setup

### Prerequisites

- Node.js 16+ and npm
- ffmpeg (required for video processing)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/video-meme.git
   cd video-meme
   ```

2. Install dependencies:
   ```
   npm run install-all
   ```

3. Set up the Segmind API key (optional but recommended):
   - Get your API key from [Segmind](https://segmind.com)
   - Create a `.env` file in the server directory based on `.env.example`:
     ```
     SEGMIND_API_KEY=your_segmind_api_key_here
     ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Using Segmind for Video Generation

This application is set up to use Segmind AI for advanced video generation. Segmind is a cutting-edge AI model developed by Alibaba that specializes in:

- Image-to-Video generation (primarily used in this app)
- Text-to-Video generation
- Video editing and enhancement

### How It Works

1. **API Integration**: When enabled, the app communicates with the Segmind API service
2. **Image Processing**: Your uploaded image is processed by Segmind's I2V-14B-720P model
3. **Motion Synthesis**: The AI generates natural movement based on the meme template context
4. **Full-Body Replacement**: Unlike simple face swaps, Segmind can generate full-body motion
5. **High Resolution Output**: Outputs videos at 720p resolution with realistic motion

### Setting Up Your API Key

The Segmind API requires an API key for access. To obtain one:

1. Visit [Segmind](https://segmind.com)
2. Sign up for an account and purchase API credits
3. Copy your API key and add it to the `.env` file in the server directory:
   ```
   SEGMIND_API_KEY=your_segmind_api_key_here
   ```
4. Restart the server if it's already running

### Fallback Mechanisms

If Segmind is not available (no API key or service errors), the application will try:

1. **Basic ffmpeg overlay**: Simple image overlay as a last resort

## Using the Application

1. **Select a Template**: Choose between Lil Yachty or PSY templates
2. **Upload Your Image**: Upload an image containing a face (preferably a headshot)
3. **Generate Meme**: Click the "Generate Meme" button
4. **Download or Share**: Once the meme is generated, you can download it or share it

## Troubleshooting

- **"Failed to generate meme"**: Check if the Segmind API key is correctly configured
- **Slow video generation**: Segmind processing can take time (30 seconds to 2 minutes typically)
- **Installation issues**: Ensure all dependencies are installed, including ffmpeg

## API Endpoints

- `POST /api/generate-meme`: Generate a meme with the provided image and template
- `GET /api/meme-templates`: List available meme templates
- `GET /api/segmind-status`: Check if Segmind API is configured

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Segmind by Alibaba Cloud
- All original meme creators and communities
