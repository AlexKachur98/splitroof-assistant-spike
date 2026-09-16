# splitroof-assistant-spike

A chat assistant for a shared household expense app, where the model picks which function to call and words the
reply but never does the arithmetic itself. Our code reads `data/household.json` and computes every number, so a
balance or a budget figure is always something the app worked out rather than something the model guessed.

Copy `.env.example` to `.env` and put an Anthropic API key in it, then `npm install`. Ask a question with
`node src/index.js "what do I owe sean"`, which prints the answer and the tools it called to get there.

`npm test` runs the unit tests for the three functions against the sample household. The assistant tests make real
API calls and skip themselves when no key is set.

This is a spike to prove the approach, not the real service.
