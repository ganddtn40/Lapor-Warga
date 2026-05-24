# Cloudinary Setup Guide for LaporWarga

This guide explains how to set up Cloudinary for uploading images directly from the frontend without using an API key or exposing your secrets. We use Cloudinary's Unsigned Uploads feature.

## 1. Create a Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com) and sign up for a free account.
2. Once logged in, go to your **Dashboard**.
3. Note down your **Cloud Name** (e.g., `dfmbpcgxo`).

## 2. Enable Unsigned Uploads & Create Upload Preset
1. Go to **Settings** (gear icon) > **Upload** tab.
2. Scroll down to the **Upload presets** section.
3. Click **Add upload preset**.
4. Set the **Upload preset name** to exactly: `laporwarga`.
5. Set the **Signing Mode** to **Unsigned**.
6. (Optional) Under the **Media analysis and processing** tab, you can set a folder or default tags if needed.
7. Click **Save**.

## 3. Environment Variables Setup
Ensure your `.env.local` contains the following variables (do not add the API Secret here):

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dfmbpcgxo
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=laporwarga
```

## 4. How the Frontend Uploads to Cloudinary
The application uses the `fetch` API to POST directly to Cloudinary's secure upload endpoint:

```ts
const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const formData = new FormData();
formData.append('file', imageFile);
formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

const response = await fetch(url, {
  method: 'POST',
  body: formData
});

const data = await response.json();
const secureUrl = data.secure_url; // This URL is then saved to Firestore!
```

## 5. Storing in Firestore
Only the resulting `secureUrl` (and possibly other metadata like width/height) is saved to your Firestore database. The raw file stays in Cloudinary, significantly reducing the payload on your Firebase database and totally bypassing Firebase Storage.
