from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="gpt-5-nano",
    input="What are three things that people find cool about science."
)

print(response.output_text)