#!/usr/bin/env python3
"""
Test script for email configuration
Run this script to verify email settings before deployment
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

def test_email_config():
    """Test email configuration using current settings"""
    
    # Load .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("⚠️  python-dotenv not installed, using existing environment variables")
    
    # Load settings from environment or .env
    try:
        from app.core.config import settings
        smtp_server = settings.SMTP_SERVER
        smtp_port = settings.SMTP_PORT
        smtp_username = settings.SMTP_USERNAME
        smtp_password = settings.SMTP_PASSWORD
        from_email = settings.FROM_EMAIL
    except ImportError:
        # Fallback to environment variables
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        from_email = os.getenv('FROM_EMAIL')
    
    print("🔧 Testing Email Configuration")
    print("=" * 50)
    print(f"SMTP Server: {smtp_server}")
    print(f"SMTP Port: {smtp_port}")
    print(f"Username: {smtp_username}")
    print(f"From Email: {from_email}")
    print(f"Password: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
    print()
    
    # Validate configuration
    if not all([smtp_server, smtp_username, smtp_password, from_email]):
        print("❌ Missing required email configuration")
        return False
    
    # Test SMTP connection
    try:
        print("🔄 Testing SMTP connection...")
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=30)
        server.set_debuglevel(0)
        
        print("✅ Connected to SMTP server")
        
        # Test STARTTLS
        print("🔄 Testing STARTTLS...")
        server.starttls()
        print("✅ STARTTLS successful")
        
        # Test authentication
        print("🔄 Testing authentication...")
        server.login(smtp_username, smtp_password)
        print("✅ Authentication successful")
        
        # Test sending a test email (optional)
        test_email = os.getenv('TEST_EMAIL', smtp_username)
        if test_email and input(f"\nSend test email to {test_email}? (y/n): ").lower() == 'y':
            try:
                msg = MIMEMultipart()
                msg['From'] = f"QLPK Test <{from_email}>"
                msg['To'] = test_email
                msg['Subject'] = "🧪 QLPK Email Configuration Test"
                
                html_body = """
                <html>
                <body>
                    <h2>✅ Email Configuration Test Successful</h2>
                    <p>Your QLPK backend email configuration is working correctly!</p>
                    <p><strong>Details:</strong></p>
                    <ul>
                        <li>SMTP Server: {smtp_server}</li>
                        <li>Port: {smtp_port}</li>
                        <li>Username: {smtp_username}</li>
                    </ul>
                    <p>This is an automated test message.</p>
                </body>
                </html>
                """.format(smtp_server=smtp_server, smtp_port=smtp_port, smtp_username=smtp_username)
                
                msg.attach(MIMEText(html_body, 'html', 'utf-8'))
                server.sendmail(from_email, test_email, msg.as_string())
                print(f"✅ Test email sent to {test_email}")
            except Exception as e:
                print(f"⚠️  Failed to send test email: {e}")
        
        server.quit()
        print("\n🎉 Email configuration test PASSED!")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication failed: {e}")
        if "application-specific password" in str(e).lower():
            print("💡 Solution: Generate a Gmail App Password at https://myaccount.google.com/apppasswords")
        return False
        
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def check_gmail_requirements():
    """Check Gmail-specific requirements"""
    print("\n📋 Gmail Configuration Checklist:")
    print("-" * 40)
    print("☐ 2-Step Verification is enabled")
    print("☐ App Password generated (not regular password)")
    print("☐ IMAP/POP access is enabled")
    print("☐ Less secure app access is OFF")
    print("☐ Using correct SMTP settings:")
    print("   - Server: smtp.gmail.com")
    print("   - Port: 587 (STARTTLS)")
    print("   - Username: your-email@gmail.com")
    print("   - Password: 16-character App Password")

if __name__ == "__main__":
    success = test_email_config()
    check_gmail_requirements()
    
    if success:
        print("\n✅ All tests passed! Your email configuration is ready for deployment.")
        sys.exit(0)
    else:
        print("\n❌ Tests failed. Please fix the configuration before deploying.")
        sys.exit(1)
