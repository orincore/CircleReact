# Development SSL/HTTPS Bypass Setup

## Problem
Network requests fail in development due to SSL certificate issues when using HTTP backend.

## Solution

### 1. Use `.env.development` File

The `.env.development` file is already configured with HTTP (not HTTPS):

```env
# Development Environment Variables
EXPO_PUBLIC_API_BASE_URL=http://172.20.10.14:8080
EXPO_PUBLIC_WS_BASE_URL=http://172.20.10.14:8080
EXPO_PUBLIC_FRONTEND_URL=http://localhost:8081
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Update the IP address** to match your machine's local IP:
- Find your IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
- Look for your WiFi/Ethernet IP (usually starts with 192.168.x.x or 172.x.x.x)
- Update `EXPO_PUBLIC_API_BASE_URL` with your IP

### 2. Backend Must Be Running

Make sure your backend is running on the same IP:

```bash
cd Backend
npm run dev
```

Backend should be accessible at: `http://YOUR_IP:8080`

### 3. Test Backend Connection

Before testing uploads, verify backend is reachable:

```bash
# From your terminal
curl http://172.20.10.14:8080/health

# Should return: {"status":"ok"}
```

### 4. Restart Expo

After updating `.env.development`:

```bash
cd Circle
npx expo start --clear
```

---

## Troubleshooting

### Error: "Network request failed"

**Cause**: Backend not reachable or wrong IP address

**Solutions**:
1. **Check backend is running**: `curl http://YOUR_IP:8080/health`
2. **Verify IP address**: Make sure IP in `.env.development` matches your machine
3. **Check firewall**: Ensure port 8080 is not blocked
4. **Use same network**: Phone/emulator must be on same WiFi as your computer

### Error: "ECONNREFUSED"

**Cause**: Backend not running or wrong port

**Solutions**:
1. Start backend: `cd Backend && npm run dev`
2. Check backend port in `Backend/.env` (should be 8080)
3. Verify backend logs show "Server running on port 8080"

### Error: "SSL certificate problem"

**Cause**: Using HTTPS instead of HTTP

**Solutions**:
1. Check `.env.development` uses `http://` not `https://`
2. Restart Expo: `npx expo start --clear`
3. Clear cache: `rm -rf node_modules/.cache`

---

## Network Configuration

### Find Your Local IP

**Mac/Linux**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows**:
```bash
ipconfig | findstr IPv4
```

**Common IP ranges**:
- Home WiFi: `192.168.1.x` or `192.168.0.x`
- Mobile hotspot: `172.20.10.x`
- Corporate network: Varies

### Update Configuration

1. **Find your IP**: Use command above
2. **Update `.env.development`**: Replace `172.20.10.14` with your IP
3. **Restart Expo**: `npx expo start --clear`
4. **Verify**: Check console logs show correct API URL

---

## Production vs Development

### Development (`.env.development`)
```env
EXPO_PUBLIC_API_BASE_URL=http://172.20.10.14:8080  # HTTP, local IP
```

### Production (`.env.production`)
```env
EXPO_PUBLIC_API_BASE_URL=https://api.circle.orincore.com  # HTTPS, domain
```

Expo automatically uses the correct file based on environment.

---

## Quick Fix Commands

```bash
# 1. Find your IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# 2. Update .env.development with your IP
# Edit the file manually

# 3. Start backend
cd Backend
npm run dev

# 4. In another terminal, start Expo
cd Circle
npx expo start --clear

# 5. Test backend
curl http://YOUR_IP:8080/health
```

---

## Verification Checklist

- [ ] Backend running on port 8080
- [ ] `.env.development` has correct local IP
- [ ] `.env.development` uses `http://` not `https://`
- [ ] Phone/emulator on same WiFi as computer
- [ ] Backend health check works: `curl http://YOUR_IP:8080/health`
- [ ] Expo restarted with `--clear` flag
- [ ] Console logs show correct API URL

---

## Expected Console Output

When everything is configured correctly, you should see:

```
🌐 API Configuration: {
  baseUrl: http://172.20.10.14:8080
  environment: development (auto-detected)
  platform: android
}

📤 Upload configuration: {
  url: http://172.20.10.14:8080/api/upload/profile-photo
  fileType: React Native
  fileName: avatar-1234567890.jpg
  hasToken: true
}

📥 Upload response: {
  status: 200
  ok: true
  statusText: OK
}

✅ Upload successful: {
  url: https://media.orincore.com/Circle/avatars/.../avatar-....jpg
  key: Circle/avatars/.../avatar-....jpg
  message: Profile photo uploaded successfully
}
```

---

## Still Having Issues?

1. **Check backend logs**: Look for errors in backend terminal
2. **Check network**: Ping your IP: `ping YOUR_IP`
3. **Try localhost**: If on emulator, try `http://10.0.2.2:8080` (Android) or `http://localhost:8080` (iOS Simulator)
4. **Disable VPN**: VPNs can block local network access
5. **Check AWS credentials**: Backend needs valid AWS S3 credentials in `Backend/.env`
