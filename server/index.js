const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads and public directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');
const outputDir = path.join(publicDir, 'output');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// API Routes
app.post('/api/generate-meme', upload.single('userImage'), async (req, res) => {
  try {
    const { memeType } = req.body;
    const userImagePath = req.file.path;
    
    if (!memeType || !userImagePath) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get the appropriate template video based on meme type
    let templateVideoPath;
    if (memeType === 'lil-yachty') {
      templateVideoPath = path.join(__dirname, 'assets', 'videos', 'lil-yachty-template.mp4');
    } else if (memeType === 'psy') {
      templateVideoPath = path.join(__dirname, 'assets', 'videos', 'psy-template.mp4');
    } else {
      return res.status(400).json({ error: 'Invalid meme type' });
    }
    
    // For demo purposes, we'll just return a mock URL
    // In a real implementation, this would process the video with face replacement
    
    // Generate a unique output filename
    const outputFilename = `meme-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);
    const publicUrl = `/output/${outputFilename}`;
    
    // Mock video processing (in a real app, this would use face detection and overlay)
    // For now, we'll just copy the template video to simulate processing
    fs.copyFileSync(templateVideoPath, outputPath);
    
    // Return the URL to the "processed" video
    return res.status(200).json({
      success: true,
      memeUrl: publicUrl,
      message: 'Meme generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating meme:', error);
    return res.status(500).json({ error: 'Failed to generate meme' });
  }
});

// Serve the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 