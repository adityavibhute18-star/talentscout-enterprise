import json
import boto3

s3 = boto3.client('s3')
BUCKET_NAME = "ai-resume-screener-aditya"

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "")

    if method == "OPTIONS":
        return {"statusCode": 200, "body": ""}

    try:
        body = json.loads(event.get("body", "{}"))
        file_name = body.get("filename", "")

        if not file_name:
            return {"statusCode": 400, "body": json.dumps({"error": "Filename required"})}

        # ✅ FIX: Replace spaces with underscores
        clean_name = file_name.replace(" ", "_")
        s3_key = f"resumes/{clean_name}"

        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": s3_key,
                "ContentType": "application/pdf"
            },
            ExpiresIn=3600
        )

        print(f"✅ Presigned URL generated for: {s3_key}")
        return {
            "statusCode": 200,
            "body": json.dumps({"uploadUrl": upload_url})
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}