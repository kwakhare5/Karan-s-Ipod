# Deployment Instructions: Render (Backend) + Vercel (Frontend)

This guide covers the complete deployment process for Karan's iPod.

---

## 📋 Pre-Deployment Checklist

✅ Code committed and pushed to GitHub (`main` branch)
✅ All dependencies in `package.json` and `requirements.txt`
✅ Build tested locally with `npm run build`
✅ Environment variables documented

---

## 🚀 Part 1: Deploy Backend to Render

### Step 1: Go to Render Dashboard

1. Visit [https://render.com](https://render.com)
2. Sign in with GitHub
3. Click **"New +"** → **"Web Service"**

### Step 2: Connect Repository

- Select your repository: `kwakhare5/Karan-s-iPod`
- Render will auto-detect the `render.yaml` configuration

### Step 3: Configure Service Settings

| Setting            | Value                   |
| ------------------ | ----------------------- |
| **Name**           | `karan-ipod-backend`    |
| **Region**         | Oregon (closest to you) |
| **Branch**         | `main`                  |
| **Root Directory** | (leave blank)           |
| **Runtime**        | `Python 3`              |
| **Build Command**  | (from render.yaml)      |
| **Start Command**  | `python server.py`      |
| **Instance Type**  | `Free`                  |

### Step 4: Add Environment Variables

Click **"Advanced"** and add:

| Key            | Value   | Required |
| -------------- | ------- | -------- |
| `PORT`         | `10000` | ✅       |
| `CORS_ORIGINS` | `*`     | ✅       |

### Step 5: Create and Deploy

- Click **"Create Web Service"**
- Wait 5-10 minutes for build and deployment
- Copy your backend URL (e.g., `https://karan-ipod-backend.onrender.com`)

### Step 6: Test Backend

Visit these URLs in your browser:

- `https://your-backend.onrender.com/top_songs.json` → Should show JSON
- `https://your-backend.onrender.com/api/library/songs` → Should show songs
- `https://your-backend.onrender.com/api/search?q=love` → Should return search results

---

## 🎨 Part 2: Deploy Frontend to Vercel

### Step 1: Go to Vercel Dashboard

1. Visit [https://vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**

### Step 2: Import Repository

- Select: `kwakhare5/Karan-s-iPod`
- Vercel will auto-detect Vite configuration

### Step 3: Configure Build Settings

**Framework Preset**: `Vite`

**Build Command**: `npm run build`

**Output Directory**: `dist`

**Install Command**: `npm install`

### Step 4: Add Environment Variable

Click **"Environment Variables"** and add:

| Key                | Value                               | Scope         |
| ------------------ | ----------------------------------- | ------------- |
| `VITE_BACKEND_URL` | `https://your-backend.onrender.com` | Production ✅ |

⚠️ **Important**: Replace `your-backend.onrender.com` with your actual Render backend URL!

### Step 5: Deploy

- Click **"Deploy"**
- Wait 2-3 minutes for build
- Copy your frontend URL (e.g., `https://karan-s-ipod.vercel.app`)

### Step 6: Test Frontend

1. Visit your Vercel URL
2. Navigate to Music → Songs
3. Click a song to play
4. Try searching for a song

---

## 🔧 Environment Variables Summary

### Render (Backend)

```
PORT=10000
CORS_ORIGINS=*
```

### Vercel (Frontend)

```
VITE_BACKEND_URL=https://your-backend.onrender.com
```

---

## ✅ Verification Tests

### Backend Tests

```bash
# Test library endpoint
curl https://your-backend.onrender.com/api/library/songs

# Test search endpoint
curl "https://your-backend.onrender.com/api/search?q=love"

# Test JSON files
curl https://your-backend.onrender.com/top_songs.json
```

### Frontend Tests

1. Open browser console (F12)
2. Check for any CORS errors
3. Verify network requests to backend are successful
4. Test song playback

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Backend returns 500 error

- **Solution**: Check Render logs in dashboard

**Problem**: CORS errors

- **Solution**: Ensure `CORS_ORIGINS=*` is set in Render

**Problem**: Songs not playing

- **Solution**: Check if `/api/stream/<video_id>` endpoint is working

### Frontend Issues

**Problem**: Blank page

- **Solution**: Check browser console for errors

**Problem**: Can't connect to backend

- **Solution**: Verify `VITE_BACKEND_URL` is set correctly in Vercel

**Problem**: Build fails

- **Solution**: Check Vercel build logs for errors

---

## 📊 Deployment Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Vercel  │ (Frontend - React/Vite)
    │ (CDN)   │
    └────┬────┘
         │
    ┌────▼────┐
    │ Render  │ (Backend - Flask/Python)
    │  (API)  │
    └────┬────┘
         │
    ┌────▼────┐
    │ YouTube │ (Music Streaming)
    │  Music  │
    └─────────┘
```

---

## 🔄 Updating Deployment

Both services auto-deploy on git push to `main`:

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin main
```

- **Render**: Auto-deploys in ~5 minutes
- **Vercel**: Auto-deploys in ~2 minutes

---

## 💰 Cost Summary

| Service   | Plan | Cost         |
| --------- | ---- | ------------ |
| Render    | Free | $0/month     |
| Vercel    | Free | $0/month     |
| **Total** |      | **$0/month** |

---

## 📝 Notes

1. **Render Free Tier**: Backend sleeps after 15 minutes of inactivity (first request takes 30-50 seconds)
2. **Vercel Free Tier**: 100GB bandwidth/month (sufficient for this project)
3. **Music Streaming**: Audio streams directly from YouTube to user (not via Render)

---

## 🎯 Post-Deployment Checklist

- [ ] Backend URL added to Vercel environment variables
- [ ] Frontend loads without errors
- [ ] Songs play correctly
- [ ] Search functionality works
- [ ] Playlists can be created
- [ ] No CORS errors in console
- [ ] Mobile responsive design works

---

## 📞 Support

If you encounter issues:

1. Check Render logs: Dashboard → Logs
2. Check Vercel logs: Dashboard → Deployments → View Build Logs
3. Check browser console for frontend errors
4. Review this guide again

**Good luck with your deployment!** 🚀
