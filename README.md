# ☀️ Sunny Spots

A map application to discover when cafes, parks, restaurants and bars get sunlight throughout the day. Built with Next.js 15, TypeScript, and integrated with multiple mapping and weather APIs.

![Sunny Spots Screenshot](screenshot.png)

## ✨ Features

- **Interactive Shadow Map**: Real-time shadow simulation showing sunlight patterns
- **Place Discovery**: Find cafes, restaurants, bars, and parks with outdoor seating
- **Weather Integration**: Current weather conditions with UV index
- **Time Controls**: Explore shadow patterns at different times of day
- **Responsive Design**: Mobile-friendly interface with adaptive layouts
- **Auto-complete Search**: Smart location and place search powered by Google Places

## ⚡ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Maps**: Mapbox GL JS with custom shadow simulation
- **APIs**: Google Places, OpenWeather, ShadeMap
- **UI Components**: Radix UI primitives with custom styling

## 📋 Prerequisites

- Node.js 18+ and pnpm
- API keys for the following services:
  - Google Places API
  - OpenWeather API
  - Mapbox
  - ShadeMap

## 🌅 Getting Started

### 1. 🌱 Clone the repository

```bash
git clone <repository-url>
cd sunnyspots
```

### 2. 📦 Install dependencies

```bash
pnpm install
```

### 3. �� Set up environment variables

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual API keys:

```env
# Google APIs
GOOGLE_API_KEY=your_google_api_key_here

# OpenWeather API
OPEN_WEATHER_API_KEY=your_openweather_api_key_here

# Mapbox API (public - will be exposed to client)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token_here

# ShadeMap API (public - will be exposed to client)
NEXT_PUBLIC_SHADEMAP_API_KEY=your_shademap_api_key_here

# Application Environment
APP_ENV=development
```

### 4. ⚡ Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 API Keys Setup

### 📍 Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Places API (New)
   - Maps JavaScript API
   - Places API (Legacy) - for photo references
4. Create credentials (API Key)
5. Restrict the API key to your domains in production

### 🌦️ OpenWeather API

1. Sign up at [OpenWeather](https://openweathermap.org/api)
2. Subscribe to the "One Call API 3.0" (free tier available)
3. Get your API key from the dashboard

### 🗺️ Mapbox

1. Sign up at [Mapbox](https://account.mapbox.com/)
2. Get your default public token from the dashboard
3. The token will start with `pk.`

### 🌑 ShadeMap API

1. Sign up at [ShadeMap](https://shademap.app/)
2. Get your API key from the dashboard
3. This is used for real-time shadow simulation

## 📜 Available Scripts

- `pnpm dev` - Start development server with Turbo
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint

## 🌍 Environment Variables

| Variable                       | Type   | Description                                        |
| ------------------------------ | ------ | -------------------------------------------------- |
| `GOOGLE_API_KEY`               | Server | Google Places API key for place search and details |
| `OPEN_WEATHER_API_KEY`         | Server | OpenWeather API key for weather data               |
| `NEXT_PUBLIC_MAPBOX_TOKEN`     | Public | Mapbox access token for map rendering              |
| `NEXT_PUBLIC_SHADEMAP_API_KEY` | Public | ShadeMap API key for shadow simulation             |
| `APP_ENV`                      | Server | Set to "development" to use placeholder images     |

## 🔄 Development vs Production

The app includes a development mode that uses placeholder images instead of making actual Google Places photo API calls. Set `APP_ENV=development` in your environment variables to enable this mode.
