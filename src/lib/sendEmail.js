import emailjs from '@emailjs/browser';

/**
 * Send an email via EmailJS.
 * Requires the user to configure serviceId, templateId, publicKey in Settings.
 *
 * The EmailJS template should use these variables:
 *   {{to_email}}  — recipient address
 *   {{subject}}   — email subject
 *   {{message}}   — email body (plain text)
 *   {{from_name}} — sender display name
 *   {{reply_to}}  — reply-to address (optional)
 */
export async function sendViaEmailJS({ serviceId, templateId, publicKey, to, subject, body, fromName }) {
  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS is not configured. Add your Service ID, Template ID and Public Key in Settings.');
  }
  return emailjs.send(
    serviceId,
    templateId,
    { to_email: to, subject, message: body, from_name: fromName || 'Hiring Team' },
    { publicKey },
  );
}

export function isEmailJSConfigured(settings) {
  return !!(settings?.emailjsServiceId && settings?.emailjsTemplateId && settings?.emailjsPublicKey);
}
