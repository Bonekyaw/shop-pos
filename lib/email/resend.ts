import { Resend } from "resend";

const OTP_EXPIRY_MINUTES = 10;
const BRAND_NAME = "FutureLink POS";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildOtpDigitCells(otp: string): string {
  const digits = otp.replace(/\D/g, "").split("");
  return digits
    .map(
      (digit) => `
        <td style="padding:0 4px;">
          <div style="
            width:44px;
            height:52px;
            line-height:52px;
            text-align:center;
            font-family:'SF Mono',Menlo,Monaco,Consolas,'Liberation Mono',monospace;
            font-size:24px;
            font-weight:700;
            color:#0f172a;
            background:#f8fafc;
            border:1px solid #e2e8f0;
            border-radius:10px;
          ">${escapeHtml(digit)}</div>
        </td>`,
    )
    .join("");
}

/** Modern, client-safe HTML for admin OTP sign-in. */
export function buildAdminOtpEmailHtml(otp: string): string {
  const safeOtp = escapeHtml(otp);
  const digitCells = buildOtpDigitCells(otp);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Your ${BRAND_NAME} sign-in code</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your sign-in code is ${safeOtp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;">
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="
                    width:40px;height:40px;
                    background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);
                    border-radius:12px;
                    text-align:center;
                    vertical-align:middle;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                    font-size:13px;
                    font-weight:800;
                    color:#ffffff;
                    letter-spacing:-0.04em;
                  ">FL</td>
                  <td style="padding-left:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">
                    ${BRAND_NAME}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="
              background:#ffffff;
              border:1px solid #e2e8f0;
              border-radius:16px;
              box-shadow:0 4px 6px -1px rgba(15,23,42,0.06),0 2px 4px -2px rgba(15,23,42,0.04);
              overflow:hidden;
            ">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#4f46e5,#818cf8,#4f46e5);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6366f1;">
                      Admin sign-in
                    </p>
                    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;color:#0f172a;letter-spacing:-0.02em;">
                      Your verification code
                    </h1>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#64748b;">
                      Enter this one-time code to access the admin dashboard. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:24px 28px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>${digitCells}</tr>
                    </table>
                    <p style="margin:16px 0 0;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:13px;color:#94a3b8;letter-spacing:0.05em;">
                      ${safeOtp}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                      <tr>
                        <td style="padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#475569;">
                          <strong style="color:#334155;">Expires in ${OTP_EXPIRY_MINUTES} minutes.</strong>
                          If you did not request this code, you can safely ignore this email — your account remains secure.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;">
              <p style="margin:0 0 4px;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
              <p style="margin:0;">This is an automated message — please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAdminOtpEmailText(otp: string): string {
  return [
    `${BRAND_NAME} — Admin sign-in`,
    "",
    "Your verification code:",
    "",
    otp,
    "",
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    "If you did not request it, you can ignore this email.",
    "",
    `© ${new Date().getFullYear()} ${BRAND_NAME}`,
  ].join("\n");
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return null;
  }
  return new Resend(key);
}

export async function sendAdminOtpEmail(input: {
  email: string;
  otp: string;
}): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not set (e.g. noreply@yourdomain.com).",
    );
  }

  const resend = getResend();
  if (!resend) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[dev] Admin OTP for ${input.email}: ${input.otp} (set RESEND_API_KEY to send real email)`,
      );
      return;
    }
    throw new Error("RESEND_API_KEY is not set.");
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.email,
      subject: `${input.otp} is your ${BRAND_NAME} sign-in code`,
      html: buildAdminOtpEmailHtml(input.otp),
      text: buildAdminOtpEmailText(input.otp),
    });

    if (error) {
      console.error("Resend API Error:", error);
      if (process.env.NODE_ENV === "development") {
        console.info(
          `[dev fallback] Resend failed, but here is your OTP for ${input.email}: ${input.otp}`,
        );
        return;
      }
      throw new Error(error.message);
    }
  } catch (err: unknown) {
    console.error("Resend Connection/Fetch Error:", err);
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[dev fallback] Resend request crashed, but here is your OTP for ${input.email}: ${input.otp}`,
      );
      return;
    }
    throw err;
  }
}
