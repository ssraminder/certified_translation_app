// lib/adobe.ts
import PDFServicesSdk from "@adobe/pdfservices-node-sdk";

const ADOBE_ID = process.env.ADOBE_PDF_CLIENT_ID!;
const ADOBE_SECRET = process.env.ADOBE_PDF_CLIENT_SECRET!;

export function getAdobeContext() {
  const creds = PDFServicesSdk.Credentials
    .servicePrincipalCredentialsBuilder()
    .withClientId(ADOBE_ID)
    .withClientSecret(ADOBE_SECRET)
    .build();
  return PDFServicesSdk.ExecutionContext.create(creds);
}

export { PDFServicesSdk };
