import json, boto3, urllib.parse, re

s3 = boto3.client('s3')
ses = boto3.client('ses', region_name='us-east-1')

# ============================================================
# CONFIGURATION
# ============================================================
HR_EMAIL = "adityavibhute28@gmail.com"   # ← Your email
SENDER_NAME = "TalentScout Enterprise"
FROM_EMAIL = "adityavibhute28@gmail.com"  # ← SES verified email
# ============================================================

ROLE_KEYWORDS = {
    "Data Scientist": ["machine learning", "deep learning", "tensorflow", "keras", "nlp", "data science"],
    "Data Analyst": ["data analysis", "tableau", "power bi", "excel", "statistics", "analytics"],
    "Python Developer": ["python", "django", "flask", "fastapi"],
    "Web Developer": ["html", "css", "javascript", "react", "nodejs", "frontend", "backend"],
    "Java Developer": ["java", "spring", "maven", "hibernate"],
    "DevOps Engineer": ["docker", "kubernetes", "aws", "linux", "git", "devops"],
    "Android Developer": ["android", "kotlin", "mobile"],
    "Database Engineer": ["sql", "mysql", "postgresql", "mongodb", "database"],
}

def extract_email(raw_text):
    patterns = [
        r'[\w\.\-]+@[\w\.\-]+\.\w{2,}',
        r'[\w\.\-]+\s*@\s*[\w\.\-]+\.\w{2,}',
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            email = match.group(0).replace(' ', '')
            print(f"📧 Email found: {email}")
            return email
    return None

def detect_role(text):
    best_role = "New Applicant"
    best_score = 0
    for role, keywords in ROLE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            best_role = role
    return best_role

def send_candidate_email(candidate_email, name, role, score, status, skills):
    """Send email to candidate — only works if email is SES verified (sandbox)"""
    if not candidate_email:
        print("⚠️ No candidate email found — skipping")
        return

    is_shortlisted = status.lower() == "shortlisted"
    subject = f"✅ You've been Shortlisted! - TalentScout Enterprise" if is_shortlisted else \
              f"📋 Resume Received - TalentScout Enterprise"

    body_html = f"""
    <html><body style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #1e293b; border-radius: 16px; padding: 30px; border: 1px solid #334155;">
            <h2 style="color: #38bdf8;">⚡ TalentScout Enterprise</h2>
            <hr style="border-color: #334155;">
            <h3>Hello {name}! 👋</h3>
            {"<p style='color: #4ade80; font-size: 18px;'>🎉 Congratulations! You have been <strong>Shortlisted</strong>!</p>" if is_shortlisted else
             "<p>Thank you for submitting your resume. It is currently <strong>Under Review</strong>.</p>"}
            <div style="background: #0f172a; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <p><strong>Role Matched:</strong> {role}</p>
                <p><strong>Match Score:</strong> <span style="color: #38bdf8; font-size: 20px;">{score}%</span></p>
                <p><strong>Skills Detected:</strong> {', '.join(skills) if skills else 'N/A'}</p>
                <p><strong>Status:</strong> <span style="color: {'#4ade80' if is_shortlisted else '#fbbf24'};">{status}</span></p>
            </div>
            {"<p style='color: #94a3b8;'>Our HR team will contact you soon. 🚀</p>" if is_shortlisted else
             "<p style='color: #94a3b8;'>We will notify you once the review is complete.</p>"}
            <hr style="border-color: #334155;">
            <p style="color: #64748b; font-size: 12px;">TalentScout Enterprise AI Screening System</p>
        </div>
    </body></html>
    """

    ses.send_email(
        Source=f"{SENDER_NAME} <{FROM_EMAIL}>",
        Destination={"ToAddresses": [candidate_email]},
        Message={
            "Subject": {"Data": subject},
            "Body": {"Html": {"Data": body_html}}
        }
    )
    print(f"✅ Candidate email sent to: {candidate_email}")

def send_hr_email(name, candidate_email, role, score, status, skills):
    """Send HR notification — always sent to your verified email"""
    subject = f"{'🎯 Shortlisted' if status.lower() == 'shortlisted' else '📋 New'} Candidate: {name} — {score}%"

    body_html = f"""
    <html><body style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #1e293b; border-radius: 16px; padding: 30px; border: 1px solid #334155;">
            <h2 style="color: #38bdf8;">⚡ TalentScout — New Candidate Alert</h2>
            <hr style="border-color: #334155;">
            <div style="background: #0f172a; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <p><strong>👤 Name:</strong> {name}</p>
                <p><strong>📧 Email:</strong> {candidate_email or 'Not found in PDF'}</p>
                <p><strong>💼 Role:</strong> {role}</p>
                <p><strong>🎯 Score:</strong> <span style="color: #38bdf8; font-size: 20px;">{score}%</span></p>
                <p><strong>🛠️ Skills:</strong> {', '.join(skills) if skills else 'N/A'}</p>
                <p><strong>📊 Status:</strong> <span style="color: {'#4ade80' if status.lower() == 'shortlisted' else '#fbbf24'};">{status}</span></p>
            </div>
            <hr style="border-color: #334155;">
            <p style="color: #64748b; font-size: 12px;">TalentScout Enterprise AI Screening System</p>
        </div>
    </body></html>
    """

    ses.send_email(
        Source=f"{SENDER_NAME} <{FROM_EMAIL}>",
        Destination={"ToAddresses": [HR_EMAIL]},
        Message={
            "Subject": {"Data": subject},
            "Body": {"Html": {"Data": body_html}}
        }
    )
    print(f"✅ HR email sent to: {HR_EMAIL}")

def lambda_handler(event, context):
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])

        print(f"Processing: {key}")

        response = s3.get_object(Bucket=bucket, Key=key)
        raw_text = response['Body'].read().decode('latin-1')

        candidate_email = extract_email(raw_text)
        text = ' '.join(re.findall(r'[a-zA-Z]{2,}', raw_text)).lower()
        print(f"Text extracted: {len(text)} chars")

        filename = key.split('/')[-1].replace('.pdf', '').replace('_', ' ')
        name = re.sub(r'\b(resume|cv|curriculum|vitae)\b', '', filename, flags=re.IGNORECASE).strip()
        name = ' '.join(name.split()).title()

        skills_lib = ["python", "java", "sql", "aws", "pandas", "html", "css",
                      "machine learning", "data analysis", "android", "mysql",
                      "javascript", "react", "numpy", "tensorflow", "docker", "git"]
        found = [s.title() for s in skills_lib if s in text]
        role = detect_role(text)
        score = min(len(found) * 15, 100)
        status = "Shortlisted" if score >= 40 else "Under Review"

        results = {
            "name": name,
            "email": candidate_email or "not.found@example.com",
            "role": role,
            "match_score": score,
            "skills_found": found,
            "status": status
        }

        # Save results to S3
        clean_filename = key.split('/')[-1].replace(' ', '_').replace('.pdf', '_results.json')
        result_key = f"results/{clean_filename}"
        s3.put_object(Bucket=bucket, Key=result_key,
                      Body=json.dumps(results), ContentType='application/json')
        print(f"✅ Saved: {result_key}")

        # ✅ HR email — always sent (your verified email)
        try:
            send_hr_email(name, candidate_email, role, score, status, found)
        except Exception as e:
            print(f"⚠️ HR email failed: {e}")

        # ✅ Candidate email — only if same as HR email (sandbox) 
        # When production access approved → remove the if condition
        try:
            if candidate_email and candidate_email.lower() == HR_EMAIL.lower():
                send_candidate_email(candidate_email, name, role, score, status, found)
            else:
                print(f"⚠️ Sandbox mode: skipping unverified candidate email ({candidate_email})")
        except Exception as e:
            print(f"⚠️ Candidate email failed: {e}")

        return {'statusCode': 200, 'body': json.dumps(results)}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {'statusCode': 500, 'body': str(e)}