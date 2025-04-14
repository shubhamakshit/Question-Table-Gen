from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import base64
import json
from datetime import datetime, timezone
import logging
from io import BytesIO

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging to use stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]  # Use StreamHandler to log to stdout
)
logger = logging.getLogger(__name__)

def extract_json_from_response(response_text):
    try:
        if "```json" in response_text:
            json_text = response_text.split("```json")[1].split("```")[0]
        else:
            json_text = response_text
        return json.loads(json_text)
    except Exception as e:
        logger.error(f"JSON extraction error: {str(e)}")
        return {
            "status": "error",
            "message": "Failed to parse response JSON",
            "error": str(e)
        }

def process_image_from_memory(image_bytes, username):
    try:
        current_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        # Initialize GenAI client
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        model = "gemini-2.0-flash-lite"

        prompt = f"""Current Date and Time (UTC): {current_time}
Current User's Login: {username}

You are given an image file. Your task is to:

    Extract question numbers and their corresponding answers, forming pairs.

    Group them under appropriate sections, such as "Question Paper 1", "Section A", "Part B", etc., if such headers are present in the image.

    If no sections are present, just list the question–answer pairs normally.

    If the image is faulty, unclear, or does not contain extractable question-answer data, return a clear error in JSON.

    Do not output anything except a valid JSON object.

Output Format:

If sections are detected:

{{
  "status": "success",
  "data": {{
    "Section 1": [
      {{"question_number": "1", "answer": "B"}},
      {{"question_number": "2", "answer": "C"}}
    ],
    "Section 2": [
      {{"question_number": "1", "answer": "A"}},
      {{"question_number": "2", "answer": "D"}}
    ]
  }}
}}

If no sections are detected:

{{
  "status": "success",
  "data": [
    {{"question_number": "1", "answer": "B"}},
    {{"question_number": "2", "answer": "C"}}
  ]
}}

If the image is faulty or data cannot be extracted:

{{
  "status": "error",
  "message": "Image is unreadable or does not contain question-answer data."
}}

Ensure the output is strictly in JSON format with no additional explanations or text."""

        result = client.models.generate_content(
            model=model,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt),
                        types.Part.from_bytes(
                            data=base64.b64decode(image_base64),
                            mime_type="image/jpeg"
                        ),
                    ],
                )
            ],
        )

        parsed_result = extract_json_from_response(result.text)
        parsed_result.update({
            "metadata": {
                "processed_at": current_time,
                "processed_by": username
            }
        })
        return parsed_result

    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        return {
            "status": "error",
            "message": "Failed to process image.",
            "error": str(e),
            "metadata": {
                "processed_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "processed_by": username
            }
        }

@app.route('/upload', methods=['POST'])
def upload():
    if 'image' not in request.files:
        return jsonify({"status": "error", "message": "No image file provided."}), 400

    image = request.files['image']
    if image.filename == '':
        return jsonify({"status": "error", "message": "No selected file."}), 400

    username = request.headers.get('X-Username', 'anonymous')

    try:
        image_bytes = image.read()
        result = process_image_from_memory(image_bytes, username)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred.",
            "error": str(e),
            "metadata": {
                "processed_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "processed_by": username
            }
        }), 500

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
