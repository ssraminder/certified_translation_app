export async function streamToGcs(
  bucketName: string,
  destinationPath: string,
  sourceStream: ReadableStream,
  contentType = "application/pdf",
): Promise<string> {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!, "base64").toString())

  // Create a simple upload using Google Cloud Storage REST API
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(destinationPath)}`

  // Get access token using service account credentials
  const accessToken = await getAccessToken(credentials)

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: sourceStream,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload to GCS: ${response.statusText}`)
  }

  const gcsUri = `gs://${bucketName}/${destinationPath}`
  console.log(`[v0] Successfully uploaded to GCS: ${gcsUri}`)
  return gcsUri
}

export async function streamFromGcs(bucketName: string, path: string): Promise<ReadableStream> {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!, "base64").toString())

  const accessToken = await getAccessToken(credentials)
  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download from GCS: ${response.statusText}`)
  }

  return response.body!
}

async function getAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  // Create JWT token manually
  const header = { alg: "RS256", typ: "JWT" }
  const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "_", "=": "" })[m]!)
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "_", "=": "" })[m]!)

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(credentials.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""), "base64"),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  )

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(
    /[+/=]/g,
    (m) => ({ "+": "-", "/": "_", "=": "" })[m]!,
  )

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}
