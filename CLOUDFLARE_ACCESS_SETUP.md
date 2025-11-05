# Cloudflare Access Setup Guide

This guide explains how to set up Cloudflare Access to automatically capture user email addresses for the SE Portal.

## ✅ What's Already Done

The SE Portal now supports **automatic authentication via Cloudflare Access**:

- ✅ Pages Function created at `/functions/api/auth/user.ts`
- ✅ Frontend updated to check for Access authentication on page load
- ✅ Automatic fallback to manual login if Access is not configured
- ✅ User email and name automatically extracted from Access headers

## 🔧 Setup Steps

### 1. Enable Cloudflare Access

1. Go to your Cloudflare Dashboard
2. Navigate to **Zero Trust** (formerly Cloudflare for Teams)
3. Go to **Access** → **Applications**
4. Click **Add an application**

### 2. Configure the Application

**Application Type:** Self-hosted

**Application Details:**
- **Application name:** SE Portal
- **Session Duration:** 24 hours (or as needed)
- **Application domain:** `seportal-pages.pages.dev` (or your custom domain)

### 3. Choose Identity Provider

Select one or more identity providers:

**For Cloudflare employees:**
- **One-time PIN** (email-based)
- **Google** (if using Google Workspace)
- **Okta/Azure AD** (if configured)

**Recommended:** Use **Google** with your organization's domain restriction

### 4. Configure Access Policy

Create a policy to allow access:

**Policy Name:** Allow Cloudflare Employees

**Rule Type:** Include

**Configure Rules:**
```
Emails ending in: @cloudflare.com
```

Or for specific users:
```
Include: Emails: user1@cloudflare.com, user2@cloudflare.com
```

### 5. Advanced Settings (Optional)

**Enable these for better experience:**
- ✅ Enable automatic `cloudflared` tunnel
- ✅ Enable App Launcher visibility
- ✅ Custom logo (upload Cloudflare logo)

## 🔍 How It Works

### Authentication Flow

1. **User visits the SE Portal** → `https://seportal-pages.pages.dev`

2. **Cloudflare Access intercepts the request:**
   - If not authenticated → Redirects to login page
   - If authenticated → Passes request through with headers

3. **Access headers are sent to the application:**
   ```
   Cf-Access-Authenticated-User-Email: user@cloudflare.com
   Cf-Access-JWT: <jwt-token>
   ```

4. **Pages Function reads the headers:**
   - Extracts email from `Cf-Access-Authenticated-User-Email`
   - Generates name from email (e.g., `john.doe@cloudflare.com` → `John Doe`)
   - Returns user data to frontend

5. **Frontend automatically logs in the user:**
   - Stores email and name in localStorage
   - Updates UI with user info
   - No manual login required!

### Code Flow

```typescript
// Pages Function: functions/api/auth/user.ts
export async function onRequest(context: any) {
  const userEmail = context.request.headers.get('Cf-Access-Authenticated-User-Email');

  if (!userEmail) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const userName = userEmail.split('@')[0]
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return new Response(JSON.stringify({
    email: userEmail,
    name: userName,
    authenticated: true
  }));
}
```

```typescript
// Frontend: app/root.tsx
useEffect(() => {
  const autoLogin = async () => {
    // Try Cloudflare Access first
    const response = await fetch('/api/auth/user');
    if (response.ok) {
      const userData = await response.json();
      if (userData.authenticated) {
        login(userData.email, userData.name);
        localStorage.setItem('seportal_user', userData.email);
        localStorage.setItem('seportal_user_name', userData.name);
      }
    }
    // Fallback to localStorage if Access not configured
  };
  autoLogin();
}, []);
```

## 🧪 Testing

### Without Access Configured
The app will fall back to the manual login modal (current behavior).

### With Access Configured

1. Visit `https://seportal-pages.pages.dev`
2. You'll be redirected to Cloudflare Access login
3. After authenticating, you're redirected back
4. The app automatically logs you in using your email
5. Your email is shown in the user menu

### Test the Auth Endpoint

```bash
# Without Access (will return 401)
curl https://seportal-pages.pages.dev/api/auth/user

# With Access (will return user data)
# You need to visit via browser after Access is configured
```

## 📋 Admin Setup

After Access is configured, you can add admins:

1. Go to **Admin** panel
2. Add admin emails (e.g., `john.doe@cloudflare.com`)
3. Users with those emails will automatically get admin privileges

## 🔒 Security Benefits

Using Cloudflare Access provides:

- ✅ **SSO Integration** - Use existing identity providers
- ✅ **MFA Support** - Enforce multi-factor authentication
- ✅ **Session Management** - Control session duration
- ✅ **Audit Logs** - Track who accessed what and when
- ✅ **IP Restrictions** - Limit access by geography/IP
- ✅ **Device Posture** - Require specific device configurations

## 🚀 Next Steps

1. **Set up Cloudflare Access** following the steps above
2. **Test the authentication** by visiting the app
3. **Add admin users** in the Admin panel
4. **Optional:** Set up custom domain with Access

## 📚 Additional Resources

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/)
- [Pages Functions Documentation](https://developers.cloudflare.com/pages/functions/)
- [Access JWT Verification](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)

## 🆘 Troubleshooting

### Issue: Access headers not received

**Solution:** Ensure Access is properly configured for your domain and the application is in the Access portal.

### Issue: User not auto-logged in

**Solution:**
1. Check browser console for errors
2. Verify `/api/auth/user` returns user data
3. Clear localStorage and try again

### Issue: Manual login still required

**Solution:** This is expected if Access is not configured. The app will fall back to manual login.

## 🔄 Migration from Manual Login

The app supports both authentication methods:

- **With Access:** Automatic login using email from Access headers
- **Without Access:** Manual login modal (existing behavior)

This allows for gradual rollout and testing before fully enforcing Access.
