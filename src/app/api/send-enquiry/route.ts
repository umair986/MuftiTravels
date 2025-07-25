import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, adults, children, date } = body;

    // Basic validation
    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      // NOTE: You must use a verified domain with Resend.
      // 'onboarding@resend.dev' is for testing ONLY.
      // Replace this with your own email, like 'noreply@muftitravels.com'
      from: 'Mufti Travels Enquiry <onboarding@resend.dev>',
      
      // The email address you want to receive the enquiries at
      to: ['muftitravels786@gmail.com'], 
      
      subject: `New Travel Enquiry from ${name}`,
      
      // Use HTML for a nicely formatted email
      html: `
        <h1>New Enquiry from Mufti Travels Website</h1>
        <p>You have received a new enquiry with the following details:</p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Preferred Date:</strong> ${date || 'Not specified'}</li>
          <li><strong>Adults:</strong> ${adults}</li>
          <li><strong>Children:</strong> ${children}</li>
        </ul>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Email sent successfully!', data }, { status: 200 });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
