# Smart Traffic Management System - Backend

## Setup Instructions

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Place your intersection video file as `intersection.mp4` in the same directory

3. Run the Flask backend:
```bash
python improved_app.py
```

## API Endpoints

- `GET /get_counts` - Get live traffic counts and signal status
- `GET /set_signal/<direction>` - Set signal manually (north/south/east/west)
- `GET /end_override` - End manual override and return to AI control
- `GET /system_status` - Get system health information

## Features

- **AI-based signal timing** with adaptive algorithms
- **Real-time vehicle detection** using OpenCV background subtraction
- **Manual override capability** for emergency situations
- **Regional vehicle counting** for each traffic direction
- **Smooth data filtering** to reduce noise in counts
- **CORS enabled** for frontend integration

## For SIH Demo

1. The system automatically detects vehicles from video feed
2. AI algorithm decides optimal signal timing based on traffic density
3. React dashboard connects to this backend via HTTP API
4. Manual override allows traffic controllers to intervene when needed

## Video Setup

- Place your intersection video as `intersection.mp4`
- Video should show a 4-way intersection
- System will automatically detect and count vehicles in each direction