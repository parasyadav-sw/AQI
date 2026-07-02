import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AirGuardAlerts")

def send_mock_email(to_email: str, subject: str, html_content: str):
    """
    Prints a beautiful simulation of an email/push dispatch to the console log,
    and logs it. In production, this uses SMTP.
    """
    logger.info(f"\n"
                f"┌────────────────────────────────────────────────────────┐\n"
                f"│ [PUSH & EMAIL ALERT SYSTEM]                            │\n"
                f"├────────────────────────────────────────────────────────┤\n"
                f"│ TO: {to_email:<51}│\n"
                f"│ SUBJECT: {subject:<46}│\n"
                f"├────────────────────────────────────────────────────────┤\n"
                f"│ CONTENT:                                               │\n"
                f"│ {html_content[:200]:<55} ... │\n"
                f"└────────────────────────────────────────────────────────┘\n")
    
    # Optional SMTP sending if SMTP settings are present and not default
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD != "app_password":
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg["To"] = to_email
            
            part = MIMEText(html_content, "html")
            msg.attach(part)
            
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
            server.quit()
            logger.info("Live email dispatched successfully via SMTP.")
        except Exception as e:
            logger.warning(f"Failed to send live email (using mock fallback): {e}")

def send_aqi_alert(email: str, name: str, city_name: str, aqi_value: int, category: str):
    subject = f"⚠️ AirGuard Warning: {city_name} AQI has become {category}"
    html = f"""
    <html>
        <body>
            <h3>Hello {name},</h3>
            <p>We detected that the average Air Quality Index (AQI) in <b>{city_name}</b> has reached <b>{aqi_value} ({category})</b>.</p>
            <p><b>Health Advice:</b> Please wear an N95 respirator mask if you step outside and avoid strenuous exercise. Keep your doors and windows shut.</p>
            <br/>
            <p>Stay safe,<br/>AirGuard AI Team</p>
        </body>
    </html>
    """
    send_mock_email(email, subject, html)

def send_sudden_spike_alert(email: str, name: str, city_name: str, sensor_name: str, old_aqi: int, new_aqi: int):
    subject = f"🚨 AirGuard Alert: Sudden Pollution Spike detected at {sensor_name}"
    html = f"""
    <html>
        <body>
            <h3>Hello {name},</h3>
            <p>Our sensor node <b>{sensor_name}</b> in <b>{city_name}</b> has recorded a sudden, critical spike in AQI.</p>
            <p>The AQI rose rapidly from <b>{old_aqi}</b> to <b>{new_aqi}</b> in the last hour.</p>
            <p><b>Recommended Action:</b> Avoid that area and stay indoors until conditions improve.</p>
            <br/>
            <p>Stay safe,<br/>AirGuard AI Team</p>
        </body>
    </html>
    """
    send_mock_email(email, subject, html)

def send_rain_improvement_alert(email: str, name: str, city_name: str, aqi_value: int, rainfall: float):
    subject = f"🌧️ AirGuard Notice: Rainfall has cleared the air in {city_name}"
    html = f"""
    <html>
        <body>
            <h3>Hello {name},</h3>
            <p>Good news! Recent rainfall of <b>{rainfall} mm</b> in <b>{city_name}</b> has washed away airborne pollutants.</p>
            <p>The current AQI is now down to <b>{aqi_value} (Clean Air)</b>.</p>
            <p>It is safe to open your windows and enjoy outdoor activities!</p>
            <br/>
            <p>Breathe easy,<br/>AirGuard AI Team</p>
        </body>
    </html>
    """
    send_mock_email(email, subject, html)
