// Integration test for the AI agent API with frontend simulation
// Run with: npx tsx src/app/api/agent/test-integration.ts

interface TestScenario {
  name: string;
  chaosDump: string;
  expectedFields: string[];
}

const testScenarios: TestScenario[] = [
  {
    name: 'Client Meeting Preparation',
    chaosDump: `I need to prepare for the client meeting on Friday. There's the presentation deck that needs updating, especially the financials section. Also need to coordinate with marketing for the campaign review, and check in with dev team about the Q3 roadmap. Oh and don't forget to send out the pre-meeting agenda by Wednesday.`,
    expectedFields: ['title', 'description', 'urgencyScore', 'estimatedHours', 'immediateFirstStep', 'actionableChecklist', 'deadline']
  },
  {
    name: 'Technical Backlog',
    chaosDump: `Got a bunch of stuff piling up: fix the bug in user authentication that's been reported, update the deployment docs for the new infra, respond to customer support tickets that have been waiting, and start planning the team offsite for next month.`,
    expectedFields: ['title', 'description', 'urgencyScore', 'estimatedHours', 'immediateFirstStep', 'actionableChecklist', 'deadline']
  },
  {
    name: 'Personal Development',
    chaosDump: `Brain dump: learn React Server Components for the new project, write blog post about AI productivity tools, clean up GitHub issues backlog, schedule 1:1s with team members, review PRs that are pending, and think about the architecture for the new microservices.`,
    expectedFields: ['title', 'description', 'urgencyScore', 'estimatedHours', 'immediateFirstStep', 'actionableChecklist', 'deadline']
  }
];

// Simulate frontend fetch call
async function simulateFrontendFetch(chaosDump: string) {
  console.log(`📤 Sending ${chaosDump.length} characters to /api/agent`);
  
  try {
    const response = await fetch('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskInput: chaosDump }),
    });
    
    return {
      success: response.ok,
      status: response.status,
      data: await response.json(),
      rawResponse: response
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// Simulate frontend state update
function simulateFrontendStateUpdate(taskData: any) {
  console.log('📋 Simulating frontend state update...');
  
  // Create Task object matching our frontend interface
  const newTask = {
    id: `task-${Date.now()}`,
    title: taskData.title,
    description: taskData.description,
    urgencyScore: taskData.urgencyScore,
    status: 'Pending' as const,
    estimatedHours: taskData.estimatedHours,
    immediateFirstStep: taskData.immediateFirstStep,
    actionableChecklist: taskData.actionableChecklist,
    deadline: new Date(taskData.deadline),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('✅ Task created for frontend:');
  console.log(`   Title: ${newTask.title}`);
  console.log(`   Urgency: ${newTask.urgencyScore}`);
  console.log(`   Estimated hours: ${newTask.estimatedHours}`);
  console.log(`   Immediate step: ${newTask.immediateFirstStep}`);
  console.log(`   Checklist items: ${newTask.actionableChecklist.length}`);
  console.log(`   Deadline: ${newTask.deadline.toLocaleDateString()}`);
  
  return newTask;
}

// Main test function
async function runIntegrationTests() {
  console.log('🧪 Running Frontend-Backend Integration Tests\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n🔍 Testing: ${scenario.name}`);
    console.log(`Input preview: "${scenario.chaosDump.substring(0, 80)}..."`);
    
    const result = await simulateFrontendFetch(scenario.chaosDump);
    
    if (!result.success) {
      console.log(`❌ API call failed: ${result.error || `Status ${result.status}`}`);
      failedTests++;
      continue;
    }
    
    if (!result.data.success) {
      console.log(`❌ API returned error: ${result.data.error || 'Unknown error'}`);
      failedTests++;
      continue;
    }
    
    // Validate response structure
    const taskData = result.data.task;
    const missingFields = scenario.expectedFields.filter(field => !(field in taskData));
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
      failedTests++;
      continue;
    }
    
    // Validate field types
    const validations = [
      { field: 'title', type: 'string', valid: typeof taskData.title === 'string' && taskData.title.trim().length > 0 },
      { field: 'description', type: 'string', valid: typeof taskData.description === 'string' && taskData.description.trim().length > 0 },
      { field: 'urgencyScore', type: 'HIGH|MEDIUM|LOW', valid: ['HIGH', 'MEDIUM', 'LOW'].includes(taskData.urgencyScore) },
      { field: 'estimatedHours', type: 'number', valid: typeof taskData.estimatedHours === 'number' && taskData.estimatedHours > 0 },
      { field: 'immediateFirstStep', type: 'string', valid: typeof taskData.immediateFirstStep === 'string' && taskData.immediateFirstStep.trim().length > 0 },
      { field: 'actionableChecklist', type: 'array', valid: Array.isArray(taskData.actionableChecklist) && taskData.actionableChecklist.length >= 2 },
      { field: 'deadline', type: 'ISO string', valid: typeof taskData.deadline === 'string' && !isNaN(new Date(taskData.deadline).getTime()) }
    ];
    
    const invalidFields = validations.filter(v => !v.valid).map(v => v.field);
    
    if (invalidFields.length > 0) {
      console.log(`❌ Invalid field types: ${invalidFields.join(', ')}`);
      failedTests++;
      continue;
    }
    
    console.log(`✅ API response valid!`);
    
    // Simulate frontend state update
    try {
      const frontendTask = simulateFrontendStateUpdate(taskData);
      console.log(`✅ Frontend simulation successful`);
      passedTests++;
    } catch (error: any) {
      console.log(`❌ Frontend simulation failed: ${error.message}`);
      failedTests++;
    }
  }
  
  // Test error scenarios
  console.log('\n🔍 Testing Error Scenarios');
  
  // Test 1: Empty input
  console.log('\n1. Testing empty chaos dump:');
  const emptyResult = await simulateFrontendFetch('');
  if (emptyResult.status === 400) {
    console.log('✅ Empty input correctly rejected (400)');
    passedTests++;
  } else {
    console.log(`❌ Expected 400 for empty input, got ${emptyResult.status}`);
    failedTests++;
  }
  
  // Test 2: Very long input
  console.log('\n2. Testing very long input:');
  const longText = 'Test '.repeat(1000); // 5000 characters
  const longResult = await simulateFrontendFetch(longText);
  if (longResult.success) {
    console.log('✅ Long input handled successfully');
    passedTests++;
  } else {
    console.log(`❌ Long input failed: ${longResult.error || `Status ${longResult.status}`}`);
    failedTests++;
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  return { passedTests, failedTests };
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🧠 Frontend-Backend Integration Test Suite');
  console.log('===========================================\n');
  console.log('Note: This test requires the server to be running on http://localhost:3000');
  console.log('Start the server with: npm run dev\n');
  
  runIntegrationTests()
    .then(({ passedTests, failedTests }) => {
      if (failedTests === 0) {
        console.log('\n🎉 All integration tests passed! Frontend-backend connection is working.');
      } else {
        console.log(`\n⚠️ ${failedTests} test(s) failed. Check API configuration and environment variables.`);
      }
      process.exit(failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runIntegrationTests, simulateFrontendFetch, simulateFrontendStateUpdate };