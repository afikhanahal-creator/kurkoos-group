// Finance configuration. Every external base URL can be pointed at a local fake for the end-to-end test
// (scripts/finance-e2e); in production they stay on the real services.
export const env = {
  sbUrl: () => String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
  sbKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  anthropic: () => process.env.FINANCE_ANTHROPIC_API || 'https://api.anthropic.com',
  anthropicKey: () => process.env.ANTHROPIC_API_KEY || '',
  model: () => process.env.FINANCE_MODEL || 'claude-opus-5-5',
  // the cost plan of the mail agent: a small model decides what is worth reading, a mid model reads the invoice, the
  // strongest model checks only the critical fields when the first reading was unsure (see readDocument)
  modelExtract: () => process.env.FINANCE_MODEL_EXTRACT || 'claude-sonnet-5-5',
  modelVerify: () => process.env.FINANCE_MODEL_VERIFY || 'claude-opus-5-5',
  modelTriage: () => process.env.FINANCE_TRIAGE_MODEL || 'claude-haiku-5-5',
  // low effort keeps one document at a few seconds inside the 60s function; raise it if mistakes show
  effort: () => process.env.FINANCE_EFFORT || 'low',
  googleOauth: () => process.env.FINANCE_GOOGLE_OAUTH || 'https://oauth2.googleapis.com',
  googleAuthorize: () => process.env.FINANCE_GOOGLE_AUTHORIZE || 'https://accounts.google.com/o/oauth2/v2/auth',
  gmailApi: () => process.env.FINANCE_GMAIL_API || 'https://gmail.googleapis.com/gmail/v1/users/me',
  msLogin: () => process.env.FINANCE_MS_LOGIN || `https://login.microsoftonline.com/${process.env.MS_TENANT_ID || 'common'}/oauth2/v2.0`,
  graphApi: () => process.env.FINANCE_GRAPH_API || 'https://graph.microsoft.com/v1.0/me',
  googleUserinfo: () => process.env.FINANCE_GOOGLE_USERINFO || 'https://openidconnect.googleapis.com/v1/userinfo',
  driveApi: () => process.env.FINANCE_DRIVE_API || 'https://www.googleapis.com/drive/v3',
  driveUpload: () => process.env.FINANCE_DRIVE_UPLOAD || 'https://www.googleapis.com/upload/drive/v3',
  dropboxAuth: () => process.env.FINANCE_DROPBOX_AUTH || 'https://www.dropbox.com/oauth2/authorize',
  dropboxApi: () => process.env.FINANCE_DROPBOX_API || 'https://api.dropboxapi.com',
  dropboxContent: () => process.env.FINANCE_DROPBOX_CONTENT || 'https://content.dropboxapi.com',
  greenApi: () => String(process.env.GREENAPI_BASE || 'https://api.green-api.com').replace(/\/$/, ''),
  resendApi: () => process.env.FINANCE_RESEND_API || 'https://api.resend.com',
}
export const BUCKET = 'finance-docs'
export const QUOTA_BYTES = 1024 ** 3
export const QUOTA_STOP = 0.75
export const MAX_FILE = 12 * 1024 * 1024
export const TIME_BUDGET_MS = 45_000
export const MIME_OK = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])
export const DOC_TYPES = ['invoice', 'receipt', 'invoice_receipt', 'credit', 'supplier_bill', 'payment_confirmation', 'proforma', 'quote', 'other']

/* list prices per million tokens (input, output), to show what reading cost. An unknown model counts at the top price. */
const PRICE = { 'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] }
export const costOf = (model, inTok = 0, outTok = 0) => { const [i, o] = PRICE[model] || [4, 20]; return (inTok * i + outTok * o) / 1e6 }
