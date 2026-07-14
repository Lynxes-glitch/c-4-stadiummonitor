import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'tencent/hy3:free';

async function testOpenRouter() {
  console.log('🔍 Testing OpenRouter API...\n');
  console.log(`Model: ${OPENROUTER_MODEL}`);
  console.log(`API Key: ${OPENROUTER_API_KEY ? '✓ Set' : '✗ Missing'}\n`);

  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Stadium Monitor Test'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'user', content: 'Say "OpenRouter API is working!" if you can read this.' }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('✅ OpenRouter API Test Successful!\n');
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n📝 Message:', data.choices?.[0]?.message?.content || 'No content');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    process.exit(1);
  }
}

testOpenRouter();
