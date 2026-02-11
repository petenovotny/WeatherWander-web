import os
import google.generativeai as genai

# 1. Configure the API key using Replit Secrets
# Ensure you have set 'GEMINI_API_KEY' in the Secrets tool
if "GEMINI_API_KEY" not in os.environ:
    raise EnvironmentError("GEMINI_API_KEY not found in environment variables. Please add it to Replit Secrets.")

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# 2. Initialize the Model
# 'gemini-1.5-flash' is optimized for speed and cost; use 'gemini-1.5-pro' for complex reasoning.
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction="You are a helpful, analytical AI agent running in a Replit environment. You answer questions concisely."
)

# 3. Start a Chat Session (Enables History/Memory)
chat_session = model.start_chat(history=[])

def run_agent():
    print("--- Gemini Agent Initialized (Type 'quit' to exit) ---")

    while True:
        try:
            # Get user input
            user_input = input("You: ")

            # Exit condition
            if user_input.lower() in ['quit', 'exit']:
                print("Agent: Goodbye.")
                break

            # Skip empty inputs
            if not user_input.strip():
                continue

            # Send message to Gemini and get response
            # stream=True allows the text to print as it generates (optional but better UX)
            response = chat_session.send_message(user_input, stream=True)

            print("Agent: ", end="")
            for chunk in response:
                if chunk.text:
                    print(chunk.text, end="")
            print("\n") # Newline after full response

        except Exception as e:
            print(f"\n[Error]: {e}")

if __name__ == "__main__":
    run_agent()