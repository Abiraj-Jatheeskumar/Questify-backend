# 🚀 Questify Backend Deployment Guide (Heroku)

## Prerequisites
- [Heroku Account](https://signup.heroku.com/) (free tier available)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Git installed
- MongoDB Atlas account (you already have this)

## Step 1: Prepare Your Environment Variables

You'll need these values from your current setup:
- **MONGO_URI**: `mongodb+srv://vithu0919:1234@questiondb.hkt4lsa.mongodb.net/?appName=questiondb`
- **JWT_SECRET**: Generate a strong random string (or use your current one)
- **EMAIL_USER**: `loushan2025@gmail.com`
- **EMAIL_PASS**: `hcjz odmc zgjo wsge`

## Step 2: Deploy to Heroku

### Option A: Using Heroku CLI (Recommended)

```bash
# Navigate to backend directory
cd c:\Users\aabir\OneDrive\Desktop\Questify\Questify-backend\backend

# Login to Heroku
heroku login

# Create a new Heroku app (choose a unique name)
heroku create questify-backend

# Set environment variables
heroku config:set MONGO_URI="mongodb+srv://vithu0919:1234@questiondb.hkt4lsa.mongodb.net/?appName=questiondb"
heroku config:set JWT_SECRET="your-super-secret-jwt-key-change-this"
heroku config:set EMAIL_USER="loushan2025@gmail.com"
heroku config:set EMAIL_PASS="hcjz odmc zgjo wsge"
heroku config:set NODE_ENV="production"

# Deploy
git push heroku main
# If your branch is named 'master', use: git push heroku master

# Open your app
heroku open
```

### Option B: Using Heroku Dashboard

1. Go to [Heroku Dashboard](https://dashboard.heroku.com/)
2. Click **New** → **Create new app**
3. Choose app name: `questify-backend` (or your preferred name)
4. Click **Create app**

#### Connect GitHub Repository:
5. Go to **Deploy** tab
6. Select **GitHub** as deployment method
7. Connect your backend repository
8. Enable **Automatic Deploys** (optional but recommended)

#### Set Environment Variables:
9. Go to **Settings** tab
10. Click **Reveal Config Vars**
11. Add these variables:
    - `MONGO_URI` = `mongodb+srv://vithu0919:1234@questiondb.hkt4lsa.mongodb.net/?appName=questiondb`
    - `JWT_SECRET` = `your-super-secret-jwt-key-change-this`
    - `EMAIL_USER` = `loushan2025@gmail.com`
    - `EMAIL_PASS` = `hcjz odmc zgjo wsge`
    - `NODE_ENV` = `production`

#### Deploy:
12. Go back to **Deploy** tab
13. Scroll to **Manual deploy**
14. Click **Deploy Branch**

## Step 3: Verify Deployment

After deployment completes:

```bash
# Check if app is running
heroku logs --tail

# Test the health endpoint
curl https://your-app-name.herokuapp.com/api/health
```

Or visit in browser: `https://your-app-name.herokuapp.com/api/health`

You should see: `{"status":"OK","message":"Server is running"}`

## Step 4: Note Your Backend URL

Your backend URL will be: `https://your-app-name.herokuapp.com`

**IMPORTANT**: Save this URL! You'll need it for the frontend deployment.

## Troubleshooting

### App crashes on startup
```bash
# Check logs
heroku logs --tail

# Common issues:
# 1. Missing environment variables - verify all config vars are set
# 2. MongoDB connection - check MONGO_URI is correct
```

### Database connection errors
- Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Check your MongoDB Atlas credentials are correct

### Port issues
- Heroku automatically sets the PORT variable, don't override it

## Useful Commands

```bash
# View logs
heroku logs --tail

# Restart app
heroku restart

# Check app status
heroku ps

# Open app in browser
heroku open

# Run commands on Heroku
heroku run node seedAdmin.js  # Seed admin user
```

## Next Steps

After backend is deployed:
1. ✅ Note your Heroku backend URL
2. 📝 Update frontend environment variables with this URL
3. 🚀 Deploy frontend to Vercel (see frontend deployment guide)
