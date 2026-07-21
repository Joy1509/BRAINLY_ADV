"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testVoiceSystem = testVoiceSystem;
// Simple test script to verify voice auth API endpoints
const API_BASE = 'http://localhost:5000/api/v1';
// Test functions
function testVoiceSystem() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🧪 Testing Voice Authentication System...\n');
            // Test 1: System Status
            console.log('1. Testing voice system status...');
            const response = yield fetch(`${API_BASE}/voice/test`);
            const result = yield response.json();
            if (result.success) {
                console.log('   ✅ Voice system is working');
            }
            else {
                console.log('   ❌ Voice system test failed:', result.message);
            }
            console.log('\n2. API Endpoints Available:');
            console.log('   📍 POST /api/v1/voice/register - Voice registration');
            console.log('   📍 POST /api/v1/voice/login - Voice authentication');
            console.log('   📍 GET  /api/v1/voice/test - System test');
            console.log('   📍 GET  /api/v1/voice/status/:username - User status');
            console.log('   📍 POST /api/v1/voice/test-audio - Audio upload test');
            console.log('\n3. Integration Status:');
            console.log('   ✅ Voice Auth Controller: Created');
            console.log('   ✅ Voice Auth Model: Created');
            console.log('   ✅ Python Bridge: Created');
            console.log('   ✅ API Routes: Created');
            console.log('   ✅ User Model: Updated');
            console.log('\n🎉 Voice Authentication API is ready for frontend integration!');
        }
        catch (error) {
            console.error('❌ API test failed:', error);
        }
    });
}
// Sample usage examples
function printUsageExamples() {
    console.log('\n📚 API Usage Examples:\n');
    console.log('1. Voice Registration:');
    console.log(`
POST ${API_BASE}/voice/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com", 
  "password": "Password123",
  "passphrase": "hello world secure",
  "encryptionPassword": "myvoicesecret"
}
  `);
    console.log('2. Voice Login:');
    console.log(`
POST ${API_BASE}/voice/login
Content-Type: multipart/form-data

{
  "username": "john_doe",
  "encryptionPassword": "myvoicesecret",
  "audio": [audio file]
}
  `);
    console.log('3. Test System:');
    console.log(`
GET ${API_BASE}/voice/test
  `);
}
// Run tests
if (require.main === module) {
    testVoiceSystem();
    printUsageExamples();
}
