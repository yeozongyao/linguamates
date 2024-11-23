import openai
import os
from dotenv import load_dotenv


load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


# Upload dataset for fine-tuning
response = openai.File.create(
    file=open("processed_data.jsonl"),
    purpose="fine-tune"
)

# Create a fine-tune job
fine_tune = openai.FineTune.create(training_file=response['id'], model="gpt-3.5-turbo")
print(fine_tune)
