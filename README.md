# 🚀 3D Collaboration Platform

A real-time 3D model collaboration platform with annotations and chat functionality.

## 📋 Setup Instructions

### 1. Repository Structure
Create the following folder structure:
3d-collab-platform/
├── routes/
│ └── Projects.js
├── models/
│ └── Project.js
├── server.js
├── .env
├── .gitignore
├── package.json
└── README.md

📦 Installed Packages
express - Web framework

mongoose - MongoDB ODM

socket.io - Real-time communication

cors - Cross-origin resource sharing

dotenv - Environment variables

nodemon - Development server (dev dependency)


Database Schema
Project Record Structure
Each model in the database follows this dynamic structure:

Core Metadata
javascript
{
  _id: ObjectId,                    // Unique identifier
  name: "string",                   // Model name
  title: "string",                  // Model title
  ownerId: "string",                // Owner identifier
  userId: null|string,              // User identifier (nullable)
  status: "active"|string,          // Model status
  createCdk1: ISODate,              // Creation timestamp
  __v: number,                      // Version key
  modelPath: "string"               // Path to model file
}
3D Model State
javascript
modelState: {
  position: [number, number, number],     // 3D position coordinates
  rotation: [number, number, number],     // 3D rotation values
  scale: [number, number, number],        // 3D scale factors
  mode: "rotate"|string,                  // Interaction mode
  annotations: [Object, Object, ...]      // Array of annotation objects
}
Chat History
javascript
chat: [
  {
    id: "timestamp",                // Message identifier
    text: "string",                 // Message content
    userId: "string",               // User identifier
    username: "string",             // Display name
    timestamp: ISODate              // Message timestamp
  }
]
Key Features
Dynamic Structure: The schema supports flexible annotation objects within modelState.annotations

Real-time Chat: Integrated chat functionality with user metadata

3D Model Management: Complete 3D transformation data (position, rotation, scale)

File Storage: References to external model files (.stl format)

Operations Supported
✅ ADD DATA - Create new model records

✅ EXPORT DATA - Export model data and state

✅ UPDATE - Modify existing models and chat

✅ DELETE - Remove model records

Example Use Case
This structure is ideal for:

3D modeling applications

Collaborative design platforms

Real-time annotation systems

Multi-user chat integrated with 3D objects




<img width="1074" height="586" alt="image" src="https://github.com/user-attachments/assets/ef846569-32aa-40e1-a016-c92d2adbb616" />


