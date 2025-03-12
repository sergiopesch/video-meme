# Video Meme Generator - Server

This is the backend server for the Video Meme Generator application. It handles the processing of user-uploaded images and template videos to create personalized video memes.

## Implementation Notes

In a full implementation, the server would use computer vision techniques to:

1. Detect faces in the user-uploaded image
2. Track faces in the template video
3. Replace the face in the video with the user's face
4. Process the video and return it to the client

### Face Detection and Tracking

For a production implementation, you would need to:

1. Use a library like OpenCV, face-api.js, or TensorFlow.js for face detection
2. Extract facial landmarks from both the user image and video frames
3. Apply transformations to align the user's face with the face in the video
4. Use techniques like face morphing or deep fake algorithms for realistic face replacement

### Current Implementation

The current implementation is a simplified version that:

1. Accepts a user image upload
2. Selects a template video based on the chosen meme type
3. Returns the template video without actual face replacement (for demo purposes)

## Template Videos

The server includes two template videos:

1. `lil-yachty-template.mp4` - Lil Yachty walking onto stage
2. `psy-template.mp4` - PSY making a grand entrance

In a production environment, you would need to:

1. Obtain proper licensing for any copyrighted video content
2. Pre-process videos to optimize for face tracking
3. Store videos in an efficient format for processing

## API Endpoints

### POST /api/generate-meme

Generates a video meme by combining a user image with a template video.

**Request:**
- `memeType` (string): Either 'jensen' or 'psy'
- `userImage` (file): The user's face image

**Response:**
```json
{
  "success": true,
  "memeUrl": "/output/meme-1234567890.mp4",
  "message": "Meme generated successfully"
}
```

## Future Improvements

1. Implement actual face replacement using computer vision libraries
2. Add more template videos and options
3. Optimize video processing for better performance
4. Add user authentication and saved memes
5. Implement video compression for faster delivery 